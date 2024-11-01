import fs from 'node:fs';

const METADATA_START = 0xFA;
const DATABASE_SECTION_START = 0xFE;
const END_OF_FILE_MARKER = 0xFF;
const HASH_TABLE_SECTION_START = 0xFB;

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
export function readRdbFile(rdbFileDir, dbFileName) {
  const pathToFile = [rdbFileDir, dbFileName].join('/'); // use proper fs
  if (!fs.existsSync(pathToFile)) {
    return {
      db: {}
    }
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
  
  const databaseIndex = databaseSection[0];
  if (databaseSection[1] !== HASH_TABLE_SECTION_START) throw new Error('Missing hash table');
  const sizeOfTheKeyValueTable = databaseSection[2];
  const sizeOfTheExpiresTable = databaseSection[3];
  // console.log({ databaseIndex, sizeOfTheKeyValueTable, sizeOfTheExpiresTable, databaseSection: databaseSection.toString(), databaseSectionBuffer: databaseSection })
  
  const startingIndex = 4;
  const valueType = databaseSection[startingIndex] === 0x00 ? 'string' : new Error('test');
  const keyNameStartingIndex = startingIndex + 1;
  const keyNameSize = databaseSection[keyNameStartingIndex];
  const keyName = databaseSection.subarray(keyNameStartingIndex + 1, keyNameStartingIndex + 1 + keyNameSize).toString();
  const keyValueIndex = keyNameStartingIndex + 1 + keyNameSize + 1;
  const keyValue = databaseSection.subarray(keyValueIndex).toString();
  
  return {
    db: {
      [keyName]: keyValue,
    }
  }
}
