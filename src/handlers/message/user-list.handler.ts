import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { botUserService } from '../../services/bot-user.service.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { logger } from '../../utils/logger.js';

export async function userListHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;

  if (!authService.isAdmin(telegramUserId)) {
    logger.warn('UserListHandler', `Non-admin user=${telegramUserId}`);
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  logger.info('UserListHandler', `user=${telegramUserId}`);
  const users = botUserService.listUsers();
  const { text, keyboard } = adminTemplate.buildUserListMessage(users);
  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
}
