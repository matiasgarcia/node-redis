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

export { set, get }