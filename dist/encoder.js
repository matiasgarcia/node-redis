export function encodeValue(value) {
    if (value === undefined || value === null) {
        return `$-1\r\n`;
    }
    if (Array.isArray(value)) {
        return `*${value.length}\r\n${value.map(v => encodeValue(v)).join('')}`;
    }
    return `$${value.length}\r\n${value}\r\n`;
}
