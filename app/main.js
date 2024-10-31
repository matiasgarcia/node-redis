const net = require("net");

console.log("Logs from your program will appear here!");

// https://redis.io/docs/latest/develop/reference/protocol-spec/#bulk-strings
 const server = net.createServer((connection) => {
  connection.on('data', (stream) => {
    const tokens = stream.toString().split('\r\n');
    console.debug(tokens);
    if(tokens.length === 0) {
      return;
    }
    const command = tokens[2];
    switch(command) {
      case 'PING':
        connection.write(`+PONG\r\n`);
        break;
      case 'ECHO':
        const arg1 = tokens[4];
        connection.write(`$${arg1.length}\r\n${arg1}\r\n`);
        break;
      default:
        console.error('unknown command', command);
      }
    connection.end();
  })
 });

 server.listen(6379, "127.0.0.1");