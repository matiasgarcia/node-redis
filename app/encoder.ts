import { BulkString } from "./bulkString.js";
import { SimpleString } from "./simpleString.js";

export function encodeValue(value: unknown): string {
  if(value === undefined || value === null) {
    return `$-1\r\n`
  }

  if(typeof value === 'number') {
    return value.toString();
  }

  if(Array.isArray(value)) {
    return `*${value.length}\r\n${value.map(v => encodeValue(v)).join('')}`
  }

  if(value instanceof SimpleString) {
    return `+${value.data}\r\n`;
  }

  if(value instanceof BulkString) {
    const data = value.data.join('\r\n');
    return `$${data.length}\r\n${data}\r\n`;
  }

  if(typeof value === 'string') {
    return `$${value.length}\r\n${value}\r\n`;
  }

  throw new Error(`Cannot encode value: ${value}`)
}