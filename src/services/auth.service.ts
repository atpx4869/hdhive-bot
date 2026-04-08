import { env } from '../config/env.js';
import { botUserRepository } from '../repositories/bot-user.repository.js';
import type { BotIdentity } from '../types/bot.js';
import { logger } from '../utils/logger.js';

export const authService = {
  resolveIdentity(telegramUserId: string): BotIdentity | null {
    if (env.BOT_ADMIN_IDS.includes(telegramUserId)) {
      logger.debug('AuthService', `Resolved admin user=${telegramUserId}`);
      return { telegramUserId, role: 'ADMIN' };
    }
    const user = botUserRepository.findByTelegramUserId(telegramUserId);
    if (user && user.enabled) {
      logger.debug('AuthService', `Resolved whitelist user=${telegramUserId}`);
      return { telegramUserId, role: 'USER' };
    }
    logger.debug('AuthService', `Resolved guest user=${telegramUserId}`);
    return null;
  },

  isAdmin(telegramUserId: string): boolean {
    return env.BOT_ADMIN_IDS.includes(telegramUserId);
  },
};
