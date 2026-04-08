import { env } from '../config/env.js';
import { botUserRepository } from '../repositories/bot-user.repository.js';

const SETTING_KEY = 'forward_bot_username';

function normalizeUsername(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withAt = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  if (!/^@[A-Za-z0-9_]{5,}$/u.test(withAt)) return null;
  return withAt;
}

export const forwardBotConfigService = {
  getForwardBotUsername(): string | null {
    const runtime = botUserRepository.getSetting(SETTING_KEY);
    const normalizedRuntime = runtime ? normalizeUsername(runtime) : null;
    if (normalizedRuntime) return normalizedRuntime;

    const envValue = env.FORWARD_BOT_USERNAME;
    return envValue ? normalizeUsername(envValue) : null;
  },

  setForwardBotUsername(input: string): string | null {
    const normalized = normalizeUsername(input);
    if (!normalized) return null;
    botUserRepository.setSetting(SETTING_KEY, normalized);
    return normalized;
  },
};
