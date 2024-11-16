export function groupIntoPairs<T>(arr: T[]): T[][] {
  const grouped: T[][] = [];
  
  for (let i = 0; i < arr.length; i += 2) {
    grouped.push(arr.slice(i, i + 2));
  }
  
  return grouped;
}

export function safeUppercase(string: string | undefined) {
  if(!string) return '';
  return string.toUpperCase();
}

export function invariant(condition: boolean, errMsg: string): asserts condition {
  if(!condition) throw new Error(errMsg);
}

export const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);

export function loggableBuffer(val: Buffer | string) {
  return typeof val === 'string' ? JSON.stringify(val.replaceAll('\r\n', ' ')) : val;
}