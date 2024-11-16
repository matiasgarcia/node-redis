import { CRLF_TERMINATOR, EMPTY_RDB_FILE } from './const.js';

export function collectCommands(stream: Buffer) {
  const firstByte = stream.at(0);
  if(!firstByte) throw new Error('no firstByte');
  const firstByteIdentifier = String.fromCharCode(firstByte);
  switch(firstByteIdentifier) {
    case '+':
    case '$':
      return [stream.toString()];
    case '*':
      return scanCommands(stream);
    default:
      throw new Error(`Unexpected format: ${firstByte} ${firstByteIdentifier}`);
  }
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