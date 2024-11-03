import { groupIntoPairs } from './utils.js';
import crypto from 'node:crypto';

export type ConfigKey = keyof IConfig;

interface IConfig {
  rdbFileDir: string | undefined,
  dbFileName: string | undefined,
  port: number,
  role: 'master' | 'slave',
  masterReplid: string,
  masterReplOffset: number,
}

const config: IConfig = {
  rdbFileDir: undefined,
  dbFileName: undefined,
  port: 6379,
  role: 'master',
  masterReplid: '',
  masterReplOffset: 0
}

const INFO_CONFIG_KEYS: ConfigKey[] = ['role', 'masterReplid', 'masterReplOffset'];

export function infoConfigKeys() {
  return INFO_CONFIG_KEYS;
}

export function isInfoConfigKey(t: string): t is ConfigKey {
  return infoConfigKeys().includes(t as ConfigKey);
}

export function getReplicationInfo() {
  return {
    role: config.role,
    masterReplid: config.masterReplid,
    masterReplOffset: config.masterReplOffset,
  }
}

export function loadConfiguration(args: Array<string>) {
  config.masterReplid = crypto.randomBytes(20).toString('hex');

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
      case 'replicaof': {
        const address = value;
        // do nothing for now
        config.role = 'slave';
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

