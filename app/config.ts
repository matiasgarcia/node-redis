import { groupIntoPairs } from './utils.js';

interface IConfig {
  rdbFileDir: string | undefined,
  dbFileName: string | undefined,
  port: number,
  role: 'master' | 'slave'
}

const config: IConfig = {
  rdbFileDir: undefined,
  dbFileName: undefined,
  port: 6379,
  role: 'master',
}

export function loadConfiguration(args: Array<string>) {
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
      case 'port': {
        const port = Number(value);
        if(Number.isNaN(port)) throw new Error('Invalid port number');
        config.port = Number(value);
        break;
      }
      default:
        throw new Error(`Unknown arg: ${arg}`)
    }
  })

  return config;
}

export function get() {
  return config;
}

