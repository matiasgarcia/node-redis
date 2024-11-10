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

function write(socket: net.Socket, val: Buffer | string) {
  console.debug(`<< ${val}`)
  socket.write(val);
}

let replicaConnections: net.Socket[] = [];

function forwardWrite(val: Buffer | string) {
  replicaConnections.forEach((replicaConnection) => write(replicaConnection, val))
}

function processCommand(stream: Buffer, connection: net.Socket) {
  const tokens = stream.toString().split('\r\n');
  console.debug(`>> ${stream.toString()}`);
  if (tokens.length === 0) {
    return;
  }
  const command = tokens[2]?.toUpperCase() ?? '';
  if(command === 'SET') forwardWrite(stream);
  switch (command) {
    case 'PING':
      return Encoder.encodeValue(new SimpleString('PONG'));
    case 'ECHO': {
      const arg1 = tokens[4];
      return Encoder.encodeValue(arg1);
    }
    case 'SET': {
      const key = tokens[4];
      const value = tokens[6];
      const opts = tokens[8] ?? '';
      const expirationTime = tokens[10];
      const options = opts.toUpperCase() === "PX" ? { expiresInMilliseconds: Number(expirationTime) } : {};
      Database.set(key, value, options)
      return Encoder.encodeValue(new SimpleString('OK'));
    }
    case 'GET': {
      const key = tokens[4];
      const value = Database.get(key);
      return Encoder.encodeValue(value);
    }
    case 'CONFIG': {
      const command = Utils.safeUppercase(tokens[4]);
      if(command !== "GET") return;
      const valueToGet = tokens[6];
      if(valueToGet === 'dir') {
        return Encoder.encodeValue(['dir', Config.get().rdbFileDir]);
      } else if(valueToGet === 'dbfilename') {
        return Encoder.encodeValue(['dbfilename', Config.get().dbFileName]);
      }
      break;
    }
    case 'KEYS': {
      const key = tokens[4];
      if (key == "*") {
        return Encoder.encodeValue(Database.keys());
      }
      break;
    }
    case 'INFO': {
      const key = tokens[4];
      if(key === undefined) {
        const configInfo = Config.infoConfigKeys().map(k => `${Utils.camelToSnakeCase(k)}:${config[k]}`)
        return Encoder.encodeValue(new BulkString(configInfo));
      } else if(key === "replication") {
        const info = Object.entries(Config.getReplicationInfo()).map(([k, v]: [k: string, v: unknown]) => 
          `${Utils.camelToSnakeCase(k)}:${v}`
        )
        return Encoder.encodeValue(new BulkString(info));
      } else if(Config.isInfoConfigKey(key)) {
        return Encoder.encodeValue(`${Utils.camelToSnakeCase(key)}:${config[key]}`);
      } else {
        console.warn(`invalid argument: ${key}`);
      }
      return;
    }
    case 'REPLCONF': {
      const key = tokens[4];
      const value = tokens[6]; // do nothing for now
      if(key === 'listening-port' || key === 'capa') {
        return Encoder.encodeValue(new SimpleString('OK'));
      }
    }
    case 'PSYNC': {
      // Handshake finished, assume RDB File was processed correctly
      replicaConnections.push(connection);
      return [
        Encoder.encodeValue(new SimpleString(`FULLRESYNC ${config.masterReplid} ${config.masterReplOffset}`)),
        Encoder.encodeValue(EMPTY_RDB_FILE)
      ]
    }
    default:
      console.error('unknown command', command);
      break;
  }
}

function receiveCommands(connection: net.Socket) {
  connection.on('data', (stream) => {
    const response = processCommand(stream, connection);
    if(!response) return;
    if(Array.isArray(response)) {
      response.forEach(r => write(connection, r));
    } else {
      write(connection, response);
    }
  })
}

net
.createServer((connection) => receiveCommands(connection))
.listen(config.port, "127.0.0.1")
.on('listening', async () => {
  console.debug(`Listening on port ${config.port} as ${config.role}`)
  if(config.role !== 'slave') return;
  const master = net.createConnection({ host: config.master.host, port: config.master.port }, () => {
    console.debug(`Connected to master on ${config.master.host}:${config.master.port}`);
  });
  await performHandshake(master, config);
  receiveCommands(master);
})
