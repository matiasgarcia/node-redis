import net from 'net';
import * as Utils from './utils.js';
import * as Database from './database.js';
import * as Encoder from './encoder.js';
import * as Config from './config.js';
import * as Rdb from './rdb.js';

const config = Config.loadConfiguration(process.argv.slice(2, process.argv.length))
const rdb = Rdb.readRdbFile(config.rdbFileDir, config.dbFileName);
Database.load(rdb.db)

console.debug('Loaded database', rdb.db)

// https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings
const server = net.createServer((connection) => {
  connection.on('data', (stream) => {
    const tokens = stream.toString().split('\r\n');
    if (tokens.length === 0) {
      return;
    }
    const command = tokens[2];
    switch (command.toUpperCase()) {
      case 'PING': 
        connection.write(`+PONG\r\n`);
        break;
      case 'ECHO': {
        const arg1 = tokens[4];
        connection.write(Encoder.encodeValue(arg1));
        break;
      }
      case 'SET': {
        const key = tokens[4];
        const value = tokens[6];
        const opts = tokens[8] ?? '';
        const expirationTime = tokens[10];
        const options = opts.toUpperCase() === "PX" ? { expiresInMilliseconds: Number(expirationTime) } : {};
        Database.set(key, value, options)
        connection.write(`+OK\r\n`);
        break;
      }
      case 'GET': {
        const key = tokens[4];
        const value = Database.get(key);
        connection.write(Encoder.encodeValue(value))
        break;
      }
      case 'CONFIG': {
        const command = Utils.safeUppercase(tokens[4]);
        if(command !== "GET") return;
        const valueToGet = tokens[6];
        if(valueToGet === 'dir') {
          connection.write(Encoder.encodeValue(['dir', Config.get().rdbFileDir]));
        } else if(valueToGet === 'dbfilename') {
          connection.write(Encoder.encodeValue(['dbfilename', Config.get().dbFileName]));
        }
        break;
      }
      case 'KEYS': {
        const key = tokens[4];
        if (key == "*") {
          connection.write(Encoder.encodeValue(Database.keys()))
        }
        break;
      }
      case 'INFO': {
        const key = tokens[4];
        Utils.invariant(key !== undefined, 'key expected');
        Utils.invariant(key !== 'role', 'only role supported');
        connection.write(Encoder.encodeValue(`role:${config.role}`));
        break;
      }
      default:
        console.error('unknown command', command);
        break;
    }
  })
});

server
.listen(config.port, "127.0.0.1")
.on('listening', () => console.debug(`Listening on port ${config.port}`))