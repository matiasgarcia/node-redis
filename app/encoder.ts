export function encodeValue(value: unknown): string {
  if(value === undefined || value === null) {
    return `$-1\r\n`
  }
  if(Array.isArray(value)) {
    return `*${value.length}\r\n${value.map(v => encodeValue(v)).join('')}`
  }

  if(typeof value === 'string') {
    return `$${value.length}\r\n${value}\r\n`;
  }

  throw new Error(`Cannot encode value: ${value}`)
}