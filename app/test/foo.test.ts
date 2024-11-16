import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collectCommands } from '../main';

describe('#collectCommands', () => {
  it('should split stream of two commands', () => {
    const result = collectCommands(
      Buffer.from("*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\n123\r\n*2\r\n$3\r\nGET\r\n$3\r\nfoo\r\n")
    )
    assert.equal(result[0], '*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\n123\r\n');
    assert.equal(result[1], '*2\r\n$3\r\nGET\r\n$3\r\nfoo\r\n');
  });
});