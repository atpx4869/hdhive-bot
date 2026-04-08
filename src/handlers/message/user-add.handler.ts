import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { botUserService } from '../../services/bot-user.service.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { logger } from '../../utils/logger.js';

export async function userAddHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;

  if (!authService.isAdmin(telegramUserId)) {
    logger.warn('UserAddHandler', `Non-admin user=${telegramUserId}`);
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const text = ctx.message?.text ?? '';
  const targetId = text.replace(/^\/user_add\s*/i, '').trim();

  if (!targetId || !/^\d+$/.test(targetId)) {
    await ctx.reply(errorTemplate.badParam('/user_add 123456789'));
    return;
  }

  logger.info('UserAddHandler', `admin=${telegramUserId} target=${targetId}`);
  const result = botUserService.addUser({ telegramUserId: targetId });

  if (!result.success) {
    logger.warn('UserAddHandler', `target=${targetId} already_exists`);
    await ctx.reply(adminTemplate.buildUserAlreadyExists().text);
    return;
  }

  await ctx.reply(adminTemplate.buildUserAddResult(targetId).text);
}
