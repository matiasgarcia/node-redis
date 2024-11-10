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
    await sendPing(client);
    await expectResponse(client, 'PONG');
    await sendReplConf(client, 'listening-port', config.port.toString());
    await expectResponse(client, 'OK');
    await sendReplConf(client, 'capa', 'psync2');
    await expectResponse(client, 'OK');

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
  return new Promise<void>((resolve, reject) => {
    write(client, Encoder.encodeValue(['PING']));
    client.once('data', (stream) => {
      console.debug(`>> ${stream.toString()}`);
      resolve();
    });
  });
}

function sendReplConf(client: net.Socket, param: string, value: string) {
  return new Promise<void>((resolve, reject) => {
    write(client, Encoder.encodeValue(['REPLCONF', param, value]));
    client.once('data', (stream) => {
      console.debug(`>> ${stream.toString()}`);
      resolve();
    });
  });
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