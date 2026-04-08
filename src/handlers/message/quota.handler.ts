import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { quotaService } from '../../services/quota.service.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { logger } from '../../utils/logger.js';

export async function quotaHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;

  if (!authService.isAdmin(telegramUserId)) {
    logger.warn('QuotaHandler', `Non-admin user=${telegramUserId}`);
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  logger.info('QuotaHandler', `user=${telegramUserId}`);
  try {
    const snapshot = await quotaService.getQuotaSnapshot();
    const { text, keyboard } = adminTemplate.buildQuotaMessage(snapshot);
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch (err) {
    logger.error('QuotaHandler', `user=${telegramUserId}`, err);
    await ctx.reply(errorTemplate.generic());
  }
}
