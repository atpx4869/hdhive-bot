import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { botUserService } from '../../services/bot-user.service.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { logger } from '../../utils/logger.js';

export async function userDelHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;

  if (!authService.isAdmin(telegramUserId)) {
    logger.warn('UserDelHandler', `Non-admin user=${telegramUserId}`);
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const text = ctx.message?.text ?? '';
  const targetId = text.replace(/^\/user_del\s*/i, '').trim();

  if (!targetId || !/^\d+$/.test(targetId)) {
    await ctx.reply(errorTemplate.badParam('/user_del 123456789'));
    return;
  }

  logger.info('UserDelHandler', `admin=${telegramUserId} target=${targetId}`);
  const result = botUserService.removeUser(targetId);

  if (!result.success) {
    logger.warn('UserDelHandler', `target=${targetId} not_found`);
    await ctx.reply(adminTemplate.buildUserNotFound().text);
    return;
  }

  await ctx.reply(adminTemplate.buildUserDelResult(targetId).text);
}
