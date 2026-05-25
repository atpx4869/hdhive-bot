import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { botUserRepository } from '../repositories/bot-user.repository.js';
import { logger } from '../utils/logger.js';
import { maskApiKey } from '../utils/format.js';

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

function readRuntimePrimaryKeys(): string[] {
  const raw = botUserRepository.getSetting(PRIMARY_KEYS_SETTING);
  if (!raw) return [];
  return uniqueKeys(parseApiKeys(raw));
}

function readRuntimeFallbackKey(): string | null {
  const raw = botUserRepository.getSetting(FALLBACK_KEY_SETTING);
  return raw ? normalizeApiKey(raw) : null;
}

/**
 * 把首把 primary Key 同步回写 .env 仅作为「冷启动兜底」用途。
 * sqlite 始终是真正的 source of truth；.env 仅用于服务首次启动尚未读取 sqlite 的情况。
 * 因此这里失败只 warn，不抛错。
 */
function writeEnvDefaultApiKey(value: string): void {
  try {
    if (!fs.existsSync(ENV_PATH)) {
      logger.warn('ApiKeyConfig', `.env not found at ${ENV_PATH}, skip syncing ${ENV_KEY}`);
      return;
    }

    const source = fs.readFileSync(ENV_PATH, 'utf8');
    const normalized = value.replace(/\r?\n/g, '').trim();
    const nextLine = `${ENV_KEY}=${normalized}`;
    const pattern = new RegExp(`^${ENV_KEY}=.*$`, 'm');
    const next = pattern.test(source)
      ? source.replace(pattern, nextLine)
      : `${source}${source.endsWith('\n') || source.length === 0 ? '' : '\n'}${nextLine}\n`;

    fs.writeFileSync(ENV_PATH, next, 'utf8');
  } catch (err) {
    logger.warn('ApiKeyConfig', `Failed to sync ${ENV_KEY} to .env (sqlite remains source of truth)`, err);
  }
}

export type ApiKeyRotationState = {
  primaryKeys: string[];
  fallbackKey: string | null;
  mode: 'auto' | 'manual';
  activeKey: string | null;
};

export type SetPrimaryKeysResult =
  | { ok: true; keys: string[] }
  | { ok: false; reason: 'empty' };

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
      primaryKeyLevels: primaryKeys.map(() => '—'),
      primaryKeyValidity: primaryKeys.map(() => '未检测'),
      overallStatus: '未检测',
      fallbackKey: maskApiKey(fallbackKey),
      primaryCount: primaryKeys.length,
      persistedDefault: maskApiKey(this.getApiKey()),
      mode,
      activeKey: maskApiKey(activeKey ?? primaryKeys[0] ?? env.DEFAULT_API_KEY),
    };
  },

  /**
   * 批量设置主 Key 列表。
   * 仅在「主列表首把」变更时才同步 .env 冷启动兜底。
   */
  setPrimaryApiKeys(input: string): SetPrimaryKeysResult {
    const keys = uniqueKeys(parseApiKeys(input));
    if (!keys.length) return { ok: false, reason: 'empty' };
    botUserRepository.setSetting(PRIMARY_KEYS_SETTING, keys.join('\n'));
    writeEnvDefaultApiKey(keys[0]!);
    const currentActive = readRuntimeActiveKey();
    if (!currentActive || !keys.includes(currentActive)) {
      botUserRepository.setSetting(ACTIVE_KEY_SETTING, keys[0]!);
    }
    return { ok: true, keys };
  },

  addPrimaryKey(input: string): { addedKey: string; totalCount: number } | null {
    const normalized = normalizeApiKey(input);
    if (!normalized) return null;

    const keys = [...this.getPrimaryApiKeys()];
    if (keys.includes(normalized)) return null;

    keys.push(normalized);
    botUserRepository.setSetting(PRIMARY_KEYS_SETTING, keys.join('\n'));

    // 首把发生变化时才回写 .env；后续追加保持冷启动兜底不变
    if (keys.length === 1) {
      botUserRepository.setSetting(ACTIVE_KEY_SETTING, keys[0]!);
      writeEnvDefaultApiKey(keys[0]!);
    }

    return { addedKey: normalized, totalCount: keys.length };
  },

  setFallbackApiKey(input: string): string | null {
    const normalized = normalizeApiKey(input);
    if (!normalized) return null;
    botUserRepository.setSetting(FALLBACK_KEY_SETTING, normalized);
    return normalized;
  },

  setFallbackApiKeyByIndex(index: number): string | null {
    const keys = this.getPrimaryApiKeys();
    const key = keys[index] ?? null;
    if (!key) return null;
    botUserRepository.setSetting(FALLBACK_KEY_SETTING, key);
    return key;
  },

  setMode(mode: 'auto' | 'manual'): 'auto' | 'manual' {
    botUserRepository.setSetting(MODE_SETTING, mode);
    return mode;
  },

  /**
   * 切换手动模式下的 Active Key —— 仅写 sqlite，不动 .env。
   * 这样 .env 始终只反映「主列表首把」，避免 active 切换污染冷启动兜底。
   */
  setActiveKeyByIndex(index: number): string | null {
    const keys = this.getPrimaryApiKeys();
    const key = keys[index] ?? null;
    if (!key) return null;
    botUserRepository.setSetting(ACTIVE_KEY_SETTING, key);
    return key;
  },

  deletePrimaryKeyByIndex(index: number): { deletedKey: string; remainingCount: number } | null {
    const keys = [...this.getPrimaryApiKeys()];
    const key = keys[index] ?? null;
    if (!key) return null;
    if (keys.length <= 1) return null;

    const wasFirst = index === 0;
    keys.splice(index, 1);
    botUserRepository.setSetting(PRIMARY_KEYS_SETTING, keys.join('\n'));

    const currentActive = readRuntimeActiveKey();
    if (!currentActive || currentActive === key || !keys.includes(currentActive)) {
      botUserRepository.setSetting(ACTIVE_KEY_SETTING, keys[0]!);
    }

    // 仅当被删的是首把时才需要更新 .env 冷启动兜底
    if (wasFirst) {
      writeEnvDefaultApiKey(keys[0]!);
    }

    const notes = readNotes();
    delete notes[key];
    botUserRepository.setSetting(NOTES_SETTING, JSON.stringify(notes));

    return { deletedKey: key, remainingCount: keys.length };
  },

  replacePrimaryKeyByIndex(index: number, input: string): string | null {
    const keys = [...this.getPrimaryApiKeys()];
    const oldKey = keys[index] ?? null;
    const newKey = normalizeApiKey(input);
    if (!oldKey || !newKey) return null;
    if (oldKey === newKey) return newKey;

    keys[index] = newKey;
    const unique = uniqueKeys(keys);
    botUserRepository.setSetting(PRIMARY_KEYS_SETTING, unique.join('\n'));

    const notes = readNotes();
    const oldNote = notes[oldKey];
    delete notes[oldKey];
    if (oldNote !== undefined) {
      notes[newKey] = oldNote;
    }
    botUserRepository.setSetting(NOTES_SETTING, JSON.stringify(notes));

    const currentActive = readRuntimeActiveKey();
    if (currentActive === oldKey || !currentActive) {
      botUserRepository.setSetting(ACTIVE_KEY_SETTING, unique[0] ?? newKey);
    }

    // 首把发生变化时才回写 .env
    if (index === 0) {
      writeEnvDefaultApiKey(unique[0] ?? newKey);
    }

    return newKey;
  },

  deleteApiKeyNoteByIndex(index: number): string | null {
    const keys = this.getPrimaryApiKeys();
    const key = keys[index] ?? null;
    if (!key) return null;
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
