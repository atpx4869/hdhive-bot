import { botUserRepository } from '../repositories/bot-user.repository.js';
import type { BotUser, AddBotUserInput, AddBotUserResult, RemoveBotUserResult } from '../types/bot.js';

export const botUserService = {
  addUser(input: AddBotUserInput): AddBotUserResult {
    const existing = botUserRepository.findByTelegramUserId(input.telegramUserId);
    if (existing) return { success: false, reason: 'already_exists' };
    const user = botUserRepository.create(input);
    return { success: true, user };
  },

  removeUser(telegramUserId: string): RemoveBotUserResult {
    const deleted = botUserRepository.delete(telegramUserId);
    if (!deleted) return { success: false, reason: 'not_found' };
    return { success: true };
  },

  listUsers(): BotUser[] {
    return botUserRepository.listEnabledUsers();
  },
};
