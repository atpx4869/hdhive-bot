import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { botUserRepository } from '../repositories/bot-user.repository.js';

const PRIMARY_KEYS_SETTING = 'hdhive_api_keys';
const FALLBACK_KEY_SETTING = 'hdhive_fallback_api_key';
const MODE_SETTING = 'hdhive_api_mode';
const ACTIVE_KEY_SETTING = 'hdhive_active_api_key';
const NOTES_SETTING = 'hdhive_api_key_notes';
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
  mode: 'auto' | 'manual';
  activeKey: string | null;
};

function readRuntimeMode(): 'auto' | 'manual' {
  const raw = botUserRepository.getSetting(MODE_SETTING);
  return raw === 'manual' ? 'manual' : 'auto';
}

function readRuntimeActiveKey(): string | null {
  const raw = botUserRepository.getSetting(ACTIVE_KEY_SETTING);
  return raw ? normalizeApiKey(raw) : null;
}

function readNotes(): Record<string, string> {
  const raw = botUserRepository.getSetting(NOTES_SETTING);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export const apiKeyConfigService = {
  getRotationState(): ApiKeyRotationState {
    const primaryKeys = readRuntimePrimaryKeys();
    const fallbackKey = readRuntimeFallbackKey();
    const mode = readRuntimeMode();
    const activeKey = readRuntimeActiveKey();

    if (primaryKeys.length > 0) {
      return {
        primaryKeys,
        fallbackKey,
        mode,
        activeKey,
      };
    }

    return {
      primaryKeys: [env.DEFAULT_API_KEY],
      fallbackKey,
      mode,
      activeKey,
    };
  },

  getPrimaryApiKeys(): string[] {
    return this.getRotationState().primaryKeys;
  },

  getFallbackApiKey(): string | null {
    return this.getRotationState().fallbackKey;
  },

  getApiKey(): string {
    const state = this.getRotationState();
    if (state.mode === 'manual') {
      return state.activeKey ?? state.primaryKeys[0] ?? env.DEFAULT_API_KEY;
    }
    return state.primaryKeys[0] ?? env.DEFAULT_API_KEY;
  },

  getMaskedStatus() {
    const { primaryKeys, fallbackKey, mode, activeKey } = this.getRotationState();
    const notes = readNotes();
    return {
      primaryKeys: primaryKeys.map(maskApiKey),
      primaryKeyNotes: primaryKeys.map(key => notes[key] ?? ''),
      primaryKeyLevels: primaryKeys.map(() => '未知'),
      primaryKeyValidity: primaryKeys.map(() => '⚠️ 待确认'),
      overallStatus: '⚠️ 仅部分 Key 可用',
      fallbackKey: maskApiKey(fallbackKey),
      primaryCount: primaryKeys.length,
      persistedDefault: maskApiKey(this.getApiKey()),
      mode,
      activeKey: maskApiKey(activeKey ?? primaryKeys[0] ?? env.DEFAULT_API_KEY),
    };
  },

  setPrimaryApiKeys(input: string): string[] {
    const keys = uniqueKeys(parseApiKeys(input));
    if (!keys.length) return [];
    botUserRepository.setSetting(PRIMARY_KEYS_SETTING, keys.join('\n'));
    writeEnvDefaultApiKey(keys[0]!);
    const currentActive = readRuntimeActiveKey();
    if (!currentActive || !keys.includes(currentActive)) {
      botUserRepository.setSetting(ACTIVE_KEY_SETTING, keys[0]!);
    }
    return keys;
  },

  setFallbackApiKey(input: string): string | null {
    const normalized = normalizeApiKey(input);
    if (!normalized) return null;
    botUserRepository.setSetting(FALLBACK_KEY_SETTING, normalized);
    return normalized;
  },

  setMode(mode: 'auto' | 'manual'): 'auto' | 'manual' {
    botUserRepository.setSetting(MODE_SETTING, mode);
    return mode;
  },

  setActiveKeyByIndex(index: number): string | null {
    const keys = this.getPrimaryApiKeys();
    const key = keys[index] ?? null;
    if (!key) return null;
    botUserRepository.setSetting(ACTIVE_KEY_SETTING, key);
    writeEnvDefaultApiKey(key);
    return key;
  },

  deletePrimaryKeyByIndex(index: number): string | null {
    const keys = [...this.getPrimaryApiKeys()];
    const key = keys[index] ?? null;
    if (!key) return null;
    if (keys.length <= 1) return null;

    keys.splice(index, 1);
    botUserRepository.setSetting(PRIMARY_KEYS_SETTING, keys.join('\n'));

    const currentActive = readRuntimeActiveKey();
    if (!currentActive || currentActive === key || !keys.includes(currentActive)) {
      botUserRepository.setSetting(ACTIVE_KEY_SETTING, keys[0]!);
      writeEnvDefaultApiKey(keys[0]!);
    }

    const notes = readNotes();
    delete notes[key];
    botUserRepository.setSetting(NOTES_SETTING, JSON.stringify(notes));

    return key;
  },

  clearFallbackApiKey(): void {
    botUserRepository.setSetting(FALLBACK_KEY_SETTING, '');
  },

  setApiKeyNoteByIndex(index: number, note: string): string | null {
    const keys = this.getPrimaryApiKeys();
    const key = keys[index] ?? null;
    if (!key) return null;
    const notes = readNotes();
    notes[key] = note.trim();
    botUserRepository.setSetting(NOTES_SETTING, JSON.stringify(notes));
    return key;
  },

  getApiKeyNotes(): Record<string, string> {
    return readNotes();
  },
};
