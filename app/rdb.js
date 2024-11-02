import fs from 'node:fs';

const METADATA_START = 0xFA;
const DATABASE_SECTION_START = 0xFE;
const END_OF_FILE_MARKER = 0xFF;
const HASH_TABLE_SECTION_START = 0xFB;

const STRING_DATA_TYPE = 0x00;
const EXPIRY_MS_MARKER = 0xFC;

const UNSIGNED_LONG_BYTE_SIZE = 8;

function getChunksFromMetadatasection(buffer) {
  let chunks = [];
  let currentChunkIndex = -1;

  for(const element of buffer) {
    if(element === METADATA_START) {
      currentChunkIndex += 1;
      chunks[currentChunkIndex] = [];
    } else {
      chunks[currentChunkIndex].push(element);
    }
  }

  return chunks.map(e => Buffer.from(e));
}

function parseMetadataSection(buffer) {
  const chunks = getChunksFromMetadatasection(buffer);
  return chunks.map(chunk => {
    const sizeOfNameOfMetadata = chunk.at(0);
    const nameOfMetadata = chunk.subarray(1, sizeOfNameOfMetadata + 1);
    const valueOfMetadata = chunk.subarray(sizeOfNameOfMetadata + 2);
    return {
      name: nameOfMetadata.toString(),
      value: valueOfMetadata.toString(), // this assumes all values are strings, which its not true
    }
  })
}

// This is a bare minimum implementation where it expects a single key with a string value to be stored in the RDB file. No expiration included.
const EMPTY_RDB = {
  db: {}
}

function parseDatabaseSection(databaseSection) {
  const databaseIndex = databaseSection[0];
  if (databaseSection[1] !== HASH_TABLE_SECTION_START) throw new Error('Missing hash table');
  const sizeOfTheKeyValueTable = databaseSection[2];
  const sizeOfTheExpiresTable = databaseSection[3];
  
  let position = 4;
  let keyCount = 0;
  let db = {}
  while(position < databaseSection.length || keyCount < sizeOfTheKeyValueTable) {
    let expiresAt = undefined;
    if(databaseSection[position] === EXPIRY_MS_MARKER) {
      const expiryRead = readUnsignedLittleEndian(databaseSection, position + 1);
      expiresAt = new Date(Number(expiryRead.value));
      position += expiryRead.bytes + 1;
    }
    if(databaseSection[position] !== STRING_DATA_TYPE) throw new Error('not supported data type');
    position += 1;

    const keyNameRead = readString(databaseSection, position);
    const keyName = keyNameRead.value;
    position += keyNameRead.bytes;

    const valueRead = readString(databaseSection, position);
    const value = valueRead.value;
    position += valueRead.bytes;

    db[keyName] = { value, expiresAt };

    keyCount += 1;
  }

  return db;
}

export function readRdbFile(rdbFileDir, dbFileName) {
  if(rdbFileDir === undefined && dbFileName === undefined) {
    return EMPTY_RDB;
  }

  const pathToFile = [rdbFileDir, dbFileName].join('/'); // use proper fs
  if (!fs.existsSync(pathToFile)) {
    return EMPTY_RDB;
  }

  const rdb = fs.readFileSync(pathToFile);
  const version = rdb.subarray(0, 9).toString();
  if(version !== 'REDIS0011') throw new Error('Unexpected redis version');
  if(rdb[8] === METADATA_START) throw new Error('Missing metadata section');
  const databaseSectionStart = rdb.findIndex(value => value === DATABASE_SECTION_START);
  const metadataBuffer = rdb.subarray(9, databaseSectionStart);
  const metadataSection = parseMetadataSection(metadataBuffer);
  const endOfFileStart = rdb.findIndex(value => value === END_OF_FILE_MARKER);
  const databaseSection = rdb.subarray(databaseSectionStart + 1, endOfFileStart);

  const db = parseDatabaseSection(databaseSection);

  return {
    db,
  }
}

function readString(buffer, position) {
  const length = buffer[position];
  const value = buffer.slice(position + 1, position + 1 + length).toString();
  return { value, bytes: 1 + length };
}

function readUnsignedLittleEndian(buffer, position) {
  const value = buffer.slice(position, position + UNSIGNED_LONG_BYTE_SIZE).readBigUInt64LE(0);
  return { value, bytes: UNSIGNED_LONG_BYTE_SIZE };
}
