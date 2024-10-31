import net from 'net';
import * as Utils from './utils.js';

let rdbFileDir = undefined;
let dbFileName = undefined;

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

function encodeValue(value) {
  if(value === undefined || value === null) {
    return `$-1\r\n`
  }
  if(Array.isArray(value)) {
    return `*${value.length}\r\n${value.map(v => encodeValue(v)).join('')}`
  }
  return `$${value.length}\r\n${value}\r\n`;
}

const map = {};

function set(key, value, opts = {}) {
  const { expiresInMilliseconds } = opts;
  map[key] = { value, expiresAt: expiresInMilliseconds ? new Date(new Date().getTime() + expiresInMilliseconds) : undefined }
}

function get(key) {
  if(map[key] === undefined) return undefined;

  const { value, expiresAt } = map[key];
  if(!expiresAt) return value;
  if(new Date() > expiresAt) return undefined;
  return value;
}

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
        connection.write(encodeValue(arg1));
        break;
      }
      case 'SET': {
        const key = tokens[4];
        const value = tokens[6];
        const opts = tokens[8] ?? '';
        const expirationTime = tokens[10];
        const options = opts.toUpperCase() === "PX" ? { expiresInMilliseconds: Number(expirationTime) } : {};
        set(key, value, options)
        connection.write(`+OK\r\n`);
        break;
      }
      case 'GET': {
        const key = tokens[4];
        const value = get(key);
        connection.write(encodeValue(value))
        break;
      }
      case 'CONFIG': {
        const command = Utils.safeUppercase(tokens[4]);
        if(command !== "GET") return;
        const valueToGet = tokens[6];
        if(valueToGet === 'dir') {
          console.log(encodeValue(['dir', rdbFileDir]));
          connection.write(encodeValue(['dir', rdbFileDir]));
        } else if(valueToGet === 'dbfilename') {
          connection.write(encodeValue(['dbfilename', dbFileName]));
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