const net = require("net");

console.log("Logs from your program will appear here!");

function encodeValue(value) {
  if(value === undefined || value === null) {
    return `$-1\r\n`
  }
  return `$${value.length}\r\n${value}\r\n`;
}

const map = {};
// https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings
const server = net.createServer((connection) => {
  connection.on('data', (stream) => {
    const tokens = stream.toString().split('\r\n');
    console.debug(tokens);
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
        map[key] = value;
        connection.write(`+OK\r\n`);
        break;
      }
      case 'GET': {
        const key = tokens[4];
        const value = map[key];
        connection.write(encodeValue(value))
        break;
      }
      default:
        console.error('unknown command', command);
        break;
    }
  })
});

server.listen(6379, "127.0.0.1");