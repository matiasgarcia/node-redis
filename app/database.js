const map = {};

function set(key, value, opts = {}) {
  const { expiresInMilliseconds } = opts;
  map[key] = { value, expiresAt: expiresInMilliseconds ? new Date(new Date().getTime() + expiresInMilliseconds) : undefined }
}

function get(key) {
  if(map[key] === undefined) return undefined;

  const { value, expiresAt } = map[key];
  if(!expiresAt) return value;
  if(new Date() > expiresAt) return undefined;
  return value;
}

function load(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
        map[key] = { value: obj[key].value }
    }
  }
}

function keys() {
  return Object.keys(map);
}

export { set, get, load, keys }
