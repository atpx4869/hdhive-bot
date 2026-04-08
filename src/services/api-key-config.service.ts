import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { botUserRepository } from '../repositories/bot-user.repository.js';

const PRIMARY_KEYS_SETTING = 'hdhive_api_keys';
const FALLBACK_KEY_SETTING = 'hdhive_fallback_api_key';
const ENV_KEY = 'DEFAULT_API_KEY';
const ENV_PATH = path.resolve(process.cwd(), '.env');

function normalizeApiKey(input: string): string | null {
  const trimmed = input.trim();
  return trimmed ? trimmed : null;
}

function parseApiKeys(input: string): string[] {
  return input
    .split(/[\n,]+/u)
    .map(part => normalizeApiKey(part) ?? '')
    .filter(Boolean);
}

function uniqueKeys(keys: string[]): string[] {
  return [...new Set(keys)];
}

function maskApiKey(key: string | null): string {
  if (!key) return '未配置';
  if (key.length <= 8) return `${key[0] ?? '*'}***${key[key.length - 1] ?? '*'}`;
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

function readRuntimePrimaryKeys(): string[] {
  const raw = botUserRepository.getSetting(PRIMARY_KEYS_SETTING);
  if (!raw) return [];
  return uniqueKeys(parseApiKeys(raw));
}

function readRuntimeFallbackKey(): string | null {
  const raw = botUserRepository.getSetting(FALLBACK_KEY_SETTING);
  return raw ? normalizeApiKey(raw) : null;
}

function writeEnvDefaultApiKey(value: string): void {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error('未找到项目根目录 .env，无法回写 DEFAULT_API_KEY');
  }

  const source = fs.readFileSync(ENV_PATH, 'utf8');
  const normalized = value.replace(/\r?\n/g, '').trim();
  const nextLine = `${ENV_KEY}=${normalized}`;
  const pattern = new RegExp(`^${ENV_KEY}=.*$`, 'm');
  const next = pattern.test(source)
    ? source.replace(pattern, nextLine)
    : `${source}${source.endsWith('\n') || source.length === 0 ? '' : '\n'}${nextLine}\n`;

  fs.writeFileSync(ENV_PATH, next, 'utf8');
}

export type ApiKeyRotationState = {
  primaryKeys: string[];
  fallbackKey: string | null;
};

export const apiKeyConfigService = {
  getRotationState(): ApiKeyRotationState {
    const primaryKeys = readRuntimePrimaryKeys();
    if (primaryKeys.length > 0) {
      return {
        primaryKeys,
        fallbackKey: readRuntimeFallbackKey(),
      };
    }

    return {
      primaryKeys: [env.DEFAULT_API_KEY],
      fallbackKey: readRuntimeFallbackKey(),
    };
  },

  getPrimaryApiKeys(): string[] {
    return this.getRotationState().primaryKeys;
  },

  getFallbackApiKey(): string | null {
    return this.getRotationState().fallbackKey;
  },

  getApiKey(): string {
    return this.getPrimaryApiKeys()[0] ?? env.DEFAULT_API_KEY;
  },

  getMaskedStatus() {
    const { primaryKeys, fallbackKey } = this.getRotationState();
    return {
      primaryKeys: primaryKeys.map(maskApiKey),
      fallbackKey: maskApiKey(fallbackKey),
      primaryCount: primaryKeys.length,
      persistedDefault: maskApiKey(this.getApiKey()),
    };
  },

  setPrimaryApiKeys(input: string): string[] {
    const keys = uniqueKeys(parseApiKeys(input));
    if (!keys.length) return [];
    botUserRepository.setSetting(PRIMARY_KEYS_SETTING, keys.join('\n'));
    writeEnvDefaultApiKey(keys[0]!);
    return keys;
  },

  setFallbackApiKey(input: string): string | null {
    const normalized = normalizeApiKey(input);
    if (!normalized) return null;
    botUserRepository.setSetting(FALLBACK_KEY_SETTING, normalized);
    return normalized;
  },
};
