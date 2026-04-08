import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { accountService } from '../../services/account.service.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { logger } from '../../utils/logger.js';

export async function meHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;

  if (!authService.isAdmin(telegramUserId)) {
    logger.warn('MeHandler', `Non-admin user=${telegramUserId}`);
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  logger.info('MeHandler', `user=${telegramUserId}`);
  try {
    const snapshot = await accountService.getAccountSnapshot();
    const { text, keyboard } = adminTemplate.buildMeMessage(snapshot);
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch (err) {
    logger.error('MeHandler', `user=${telegramUserId}`, err);
    await ctx.reply(errorTemplate.generic());
  }
}
