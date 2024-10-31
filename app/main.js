import net from 'net';
import * as Utils from './utils.js';
import * as Database from './database.js';
import * as Encoder from './encoder.js';

let rdbFileDir;
let dbFileName;

function init() {
  const args = process.argv.slice(2, process.argv.length);
  if(!args.length) return;
  Utils.groupIntoPairs(args).forEach(([arg, value]) => {
    const parsedArg = arg.replace('--', '');
    if(!value) throw new Error(`Missing arg for: ${arg}`);
    switch(parsedArg) {
      case 'dir':
        rdbFileDir = value;
        break;
      case 'dbfilename':
        dbFileName = value;
        break;
      default:
        throw new Error(`Unknown arg: ${arg}`)
    }
  })
}

init();

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
          connection.write(Encoder.encodeValue(['dir', rdbFileDir]));
        } else if(valueToGet === 'dbfilename') {
          connection.write(Encoder.encodeValue(['dbfilename', dbFileName]));
        }
        break;
      }
      default:
        console.error('unknown command', command);
        break;
    }
  })
});

server.listen(6379, "127.0.0.1");