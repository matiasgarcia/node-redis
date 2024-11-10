import net from 'net';
import * as Encoder from '../encoder.js';
import * as Config from '../config.js';
import { SimpleString } from '../simpleString.js';

const HANDSHAKE_TIMEOUT = 30000;

function write(socket: net.Socket, val: string) {
  console.debug(`<< ${val}`)
  socket.write(val);
}

export async function performHandshake(client: net.Socket, config: Config.IConfig) {
  const timeoutId = setTimeout(() => {
    throw new Error('Handshake failed: Timeout exceeded');
  }, HANDSHAKE_TIMEOUT);

  try {
    sendPing(client);
    await expectResponse(client, 'PONG');
    sendReplConf(client, 'listening-port', config.port.toString());
    await expectResponse(client, 'OK');
    sendReplConf(client, 'capa', 'psync2');
    await expectResponse(client, 'OK');
    sendPsync(client);

    // Handshake successful, clear timeout and continue
    clearTimeout(timeoutId);
    client.on('data', (stream) => {
      console.debug(`>> ${stream.toString()}`);
    });
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function sendPing(client: net.Socket) {
  write(client, Encoder.encodeValue(['PING']));
}

function sendReplConf(client: net.Socket, param: string, value: string) {
  write(client, Encoder.encodeValue(['REPLCONF', param, value]));
}

function sendPsync(client: net.Socket) {
  write(client, Encoder.encodeValue(['PSYNC', '?', '-1']))
}

function expectResponse(client: net.Socket, expectedResponse: string) {
  return new Promise<void>((resolve, reject) => {
    client.once('data', (stream) => {
      const response = stream.toString();
      console.debug(`>> ${response}`);
      if (response === Encoder.encodeValue(new SimpleString(expectedResponse))) {
        resolve();
      } else {
        reject(new Error(`Expected ${expectedResponse} during handshake, but got ${response}`));
      }
    });
  });
}