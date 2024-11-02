import { groupIntoPairs } from './utils.js';

const config = {
  rdbFileDir: undefined,
  dbFileName: undefined,
}

export function loadConfiguration(args) {
  if(!args.length) {
    return config;
  }

  groupIntoPairs(args).forEach(([arg, value]) => {
    const parsedArg = arg.replace('--', '');
    if(!value) throw new Error(`Missing arg for: ${arg}`);
    switch(parsedArg) {
      case 'dir':
        config.rdbFileDir = value;
        break;
      case 'dbfilename':
        config.dbFileName = value;
        break;
      default:
        throw new Error(`Unknown arg: ${arg}`)
    }
  })

  return config;
}

export function get() {
  return config;
}

