import { CRLF_TERMINATOR, EMPTY_RDB_FILE } from './const.js';
import { invariant } from './utils.js';

export function collectCommands(stream: Buffer) {
  return scanCommands2(stream);
}

export function scanCommands2(stream: Buffer): Array<Buffer> {
  let i = 0;
  let commands: Array<Buffer> = [];

  do {
    const byte = stream.at(i);
    invariant(typeof byte !== 'undefined', 'expected byte');
    switch(String.fromCharCode(byte)) {
      case '+': {
        const startOfCLRF = stream.indexOf(CRLF_TERMINATOR, i);
        if (startOfCLRF === -1) throw new Error('Missing CRLF for + command.');
        const endOfCommandIndex = startOfCLRF + 2;
        commands.push(stream.subarray(i, endOfCommandIndex));
        i = endOfCommandIndex;
        break;
      }
      case '$': {
        const startOfLength = stream.indexOf(CRLF_TERMINATOR, i);
        if(startOfLength === -1) throw new Error('Missing endOfLength for $');

        // Parse the length of the value
        const encodedValueLength = stream.subarray(i + 1, startOfLength).toString();
        const valueLength = Number(encodedValueLength);
        if (Number.isNaN(valueLength)) throw new Error('Value length is not a number.');

        // Calculate the end of the value
        const valueStartIndex = startOfLength + 1;
        const endIndex = stream.indexOf(CRLF_TERMINATOR, valueStartIndex);
        if (endIndex === -1) {
          // binary
          const command = stream.subarray(i);
          commands.push(command);
          i += command.length + 1;
        } else {
          const command = stream.subarray(i, endIndex + 2)
          commands.push(command);
          i += command.length;
        }
        break;
      }
      case '*': {
        const startOfLength = stream.indexOf(CRLF_TERMINATOR, i);
        if (startOfLength === -1) throw new Error('Missing end of length for * command.');
        const encodedArrayLength = stream.subarray(i + 1, startOfLength).toString();
        const arrayLength = Number(encodedArrayLength);
        if (Number.isNaN(arrayLength)) throw new Error('Array length is not a number.');

        let commandByteSize = 1 + encodedArrayLength.length + 2; // * + length + CRLF
        let subIndex = startOfLength + 2; // Start parsing the array content
        for (let j = 0; j < arrayLength; j++) {
          const subCommands = scanCommands2(stream.subarray(subIndex));
          const subCommand = subCommands[0]; // Parse one subcommand at a time
          commandByteSize += subCommand.byteLength;
          subIndex += subCommand.byteLength;
        }
        
        commands.push(stream.subarray(i, i + commandByteSize));
        i += commandByteSize;
        break;
      }
      default:
        throw new Error(`Unexpected byte ${byte?.toString()} ${String.fromCharCode(byte)}`)
    }
  } while(i < stream.length);

  return commands;
}

function scanCommands(stream: Buffer): Array<string> {
  const chunks = stream.toString().split(CRLF_TERMINATOR);
  const commands: Array<string> = [];
  for(let i = 0; i < chunks.length;) {
    const element = chunks[i];
    if(!element) { return commands }
    if(element[0] !== '*') throw new Error('unexpected');
    const length = Number(element.substring(1));
    const amountOfElementsToCollect = length * 2; // each element has its two first bytes that indicate the type of value
    const endIndex = i + amountOfElementsToCollect + 1
    const elementsToCollect = chunks.slice(i, endIndex);
    commands.push(`${elementsToCollect.join(CRLF_TERMINATOR)}${CRLF_TERMINATOR}`);
    i = endIndex;
  }

  return commands;
}