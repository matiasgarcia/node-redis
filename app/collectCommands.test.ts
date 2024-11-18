import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collectCommands } from './collectCommands';

describe('#collectCommands', () => {
  it('should split stream of two commands', () => {
    const result = collectCommands(
      Buffer.from("*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\n123\r\n*2\r\n$3\r\nGET\r\n$3\r\nfoo\r\n")
    )
    assert.deepEqual(result.length, 1);
    assert.deepEqual(result[0], Buffer.from("*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\n123\r\n*2\r\n$3\r\nGET\r\n$3\r\nfoo\r\n"));
  });

  it('should parse single command', () => {
    const expected = Buffer.from("$3\r\nSET\r\n");
    const result = collectCommands(
      expected
    )
    assert.deepEqual(result[0], expected);
  })

  it('should split buffered commands into two', () => {
    const result = collectCommands(Buffer.from("+FULLRESYNC 75cd7bc10c49047e0d163660f3b90625b1af31dc 0\r\n$88\r\nREDIS0011\xfa\tredis-ver\x057.2.0\xfa\nredis-bits\xc0@\xfa\x05ctime\xc2m\b\xbce\xfa\bused-mem°\xc4\x10\x00\xfa\baof-base\xc0\x00\xff\xf0n;\xfe\xc0\xffZ\xa2"));
    assert.equal(result.length, 2);
    assert.deepEqual(result[0], Buffer.from("+FULLRESYNC 75cd7bc10c49047e0d163660f3b90625b1af31dc 0\r\n"));
    assert.deepEqual(result[1], Buffer.from("$88\r\nREDIS0011\xfa\tredis-ver\x057.2.0\xfa\nredis-bits\xc0@\xfa\x05ctime\xc2m\b\xbce\xfa\bused-mem°\xc4\x10\x00\xfa\baof-base\xc0\x00\xff\xf0n;\xfe\xc0\xffZ\xa2"));
  })

  it('parses RESP arrays', () => {
    const result = collectCommands(Buffer.from("*2\r\n$5\r\nhello\r\n$5\r\nworld\r\n"));
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], Buffer.from("*2\r\n$5\r\nhello\r\n$5\r\nworld\r\n"));
  })
});