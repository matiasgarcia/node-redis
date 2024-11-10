import net from 'net';
import * as Utils from './utils.js';
import * as Database from './database.js';
import * as Encoder from './encoder.js';
import * as Config from './config.js';
import * as Rdb from './rdb.js';
import { BulkString } from './bulkString.js';
import { SimpleString } from './simpleString.js';
import { performHandshake } from './replica/handshake.js';
import { EMPTY_RDB_FILE } from './const.js';

const config = Config.loadConfiguration(process.argv.slice(2, process.argv.length))
const rdb = Rdb.readRdbFile(config.rdbFileDir, config.dbFileName);
Database.load(rdb.db)

console.debug('Loaded database', rdb.db)

function write(socket: net.Socket, val: string) {
  console.debug(`<< ${val}`)
  socket.write(val);
}

function receiveCommands(connection: net.Socket) {
  connection.on('data', (stream) => {
    const tokens = stream.toString().split('\r\n');
    console.debug(`>> ${stream.toString()}`);
    if (tokens.length === 0) {
      return;
    }
    const command = tokens[2];
    switch (command.toUpperCase()) {
      case 'PING':
        write(connection, Encoder.encodeValue(new SimpleString('PONG')));
        break;
      case 'ECHO': {
        const arg1 = tokens[4];
        write(connection, Encoder.encodeValue(arg1));
        break;
      }
      case 'SET': {
        const key = tokens[4];
        const value = tokens[6];
        const opts = tokens[8] ?? '';
        const expirationTime = tokens[10];
        const options = opts.toUpperCase() === "PX" ? { expiresInMilliseconds: Number(expirationTime) } : {};
        Database.set(key, value, options)
        write(connection, Encoder.encodeValue(new SimpleString('OK')));
        break;
      }
      case 'GET': {
        const key = tokens[4];
        const value = Database.get(key);
        write(connection, Encoder.encodeValue(value))
        break;
      }
      case 'CONFIG': {
        const command = Utils.safeUppercase(tokens[4]);
        if(command !== "GET") return;
        const valueToGet = tokens[6];
        if(valueToGet === 'dir') {
          write(connection, Encoder.encodeValue(['dir', Config.get().rdbFileDir]));
        } else if(valueToGet === 'dbfilename') {
          write(connection, Encoder.encodeValue(['dbfilename', Config.get().dbFileName]));
        }
        break;
      }
      case 'KEYS': {
        const key = tokens[4];
        if (key == "*") {
          write(connection, Encoder.encodeValue(Database.keys()))
        }
        break;
      }
      case 'INFO': {
        const key = tokens[4];
        if(key === undefined) {
          const configInfo = Config.infoConfigKeys().map(k => `${Utils.camelToSnakeCase(k)}:${config[k]}`)
          write(connection, Encoder.encodeValue(new BulkString(configInfo)));
        } else if(key === "replication") {
          const info = Object.entries(Config.getReplicationInfo()).map(([k, v]: [k: string, v: unknown]) => 
            `${Utils.camelToSnakeCase(k)}:${v}`
          )
          write(connection, Encoder.encodeValue(new BulkString(info)));
        } else if(Config.isInfoConfigKey(key)) {
          write(connection, Encoder.encodeValue(`${Utils.camelToSnakeCase(key)}:${config[key]}`));
        } else {
          throw new Error(`invalid argument: ${key}`)
        }
        break;
      }
      case 'REPLCONF': {
        const key = tokens[4];
        const value = tokens[6]; // do nothing for now
        if(key === 'listening-port' || key === 'capa') {
          write(connection, Encoder.encodeValue(new SimpleString('OK')));
        }
        break;
      }
      case 'PSYNC': {
        write(connection, Encoder.encodeValue(new SimpleString(`FULLRESYNC ${config.masterReplid} ${config.masterReplOffset}`)));
        write(connection, `$${EMPTY_RDB_FILE.length}\r\n${EMPTY_RDB_FILE}`);
        break;
      }
      default:
        console.error('unknown command', command);
        break;
    }
  })
}

const server = net
.createServer((connection) => receiveCommands(connection))
.listen(config.port, "127.0.0.1")
.on('listening', () => {
  console.debug(`Listening on port ${config.port} as ${config.role}`)
  if(config.role !== 'slave') return;
  const client = net.createConnection({ host: config.master.host, port: config.master.port }, () => {
    console.debug(`Connected to master on ${config.master.host}:${config.master.port}`);
  });
  performHandshake(client, config);
})
