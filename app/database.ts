export interface IDatabase {
  [key: string]: {
    value: unknown,
    expiresAt?: Date,
  }
}

const map: IDatabase = {};

function set(key: string, value: unknown, opts: { expiresInMilliseconds?: number }  = {}) {
  const { expiresInMilliseconds } = opts;
  map[key] = { value, expiresAt: expiresInMilliseconds ? new Date(new Date().getTime() + expiresInMilliseconds) : undefined }
}

function get(key: string) {
  if(map[key] === undefined) return undefined;

  const { value, expiresAt } = map[key];
  if(!expiresAt) return value;
  if(new Date() > expiresAt) return undefined;
  return value;
}

function load(obj: IDatabase) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
        map[key] = { value: obj[key].value, expiresAt: obj[key].expiresAt }
    }
  }
}

function keys() {
  return Object.keys(map);
}

export { set, get, load, keys }
