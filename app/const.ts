const hexString = '524544495330303131fa0972656469732d76657205372e322e30fa0a72656469732d62697473c040fa056374696d65c26d08bc65fa08757365642d6d656dc2b0c41000fa08616f662d62617365c000fff06e3bfec0ff5aa2';
const EMPTY_RDB_FILE = Buffer.from(hexString, 'hex');
const CRLF_TERMINATOR = "\r\n";

export { CRLF_TERMINATOR, EMPTY_RDB_FILE }
