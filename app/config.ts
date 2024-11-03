import * as Utils from './utils.js';
import crypto from 'node:crypto';

export type ConfigKey = keyof IConfig;

export type IConfig = {
  rdbFileDir: string | undefined,
  dbFileName: string | undefined,
  port: number,
  masterReplid: string,
  masterReplOffset: number,
} & ({
  role: 'master',
  master: undefined
} | {
  role: 'slave',
  master: {
    host: string,
    port: number
  }
})

const config: IConfig = {
  rdbFileDir: undefined,
  dbFileName: undefined,
  port: 6379,
  role: 'master',
  masterReplid: '',
  masterReplOffset: 0,
  master: undefined
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

  Utils.groupIntoPairs(args).forEach(([arg, value]) => {
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
        const [host, port] = value.split(' ');
        const parsedPort = Number(port);
        Utils.invariant(Number.isFinite(parsedPort), 'port must be a number');
        config.role = 'slave';
        config.master = {
          host,
          port: parsedPort,
        }
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

