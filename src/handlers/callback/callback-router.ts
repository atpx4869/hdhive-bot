import type { Context } from 'grammy';
import { parseCallbackData } from '../../utils/callback-data.js';
import { authService } from '../../services/auth.service.js';
import { helpTemplate } from '../../templates/help.template.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { safeEditMessageText } from '../../utils/telegram-safe.js';
import { handleSearchCallbacks } from './search-callbacks.js';
import { handleUnlockCallbacks } from './unlock-callbacks.js';
import { handleAdminCallbacks } from './admin-callbacks.js';

export async function callbackRouter(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;

  const parsed = parseCallbackData(data);
  if (!parsed) {
    logger.warn('CallbackRouter', `user=${telegramUserId} unknown callback="${data}"`);
    return;
  }

  logger.info('CallbackRouter', `user=${telegramUserId} type=${parsed.type}`);

  const identity = authService.resolveIdentity(telegramUserId);

  // 先处理不需要白名单的回调
  if (parsed.type === 'help_example') {
    const { text, keyboard } = helpTemplate.buildSearchExampleMessage(env.BOT_USERNAME);
    await safeEditMessageText(ctx, text, { reply_markup: keyboard });
    return;
  }

  if (parsed.type === 'help_usage') {
    const { text, keyboard } = helpTemplate.buildUsageMessage(env.BOT_USERNAME);
    await safeEditMessageText(ctx, text, { reply_markup: keyboard });
    return;
  }

  if (!identity) {
    await ctx.reply(errorTemplate.noPermission());
    return;
  }

  const wantsCustomAck = parsed.type === 'admin_api_mode' || parsed.type === 'admin_api_active' || parsed.type === 'admin_api_set_fallback';
  if (!wantsCustomAck) {
    await ctx.answerCallbackQuery();
  }

  if (await handleSearchCallbacks(ctx, telegramUserId, parsed as any)) return;
  if (await handleUnlockCallbacks(ctx, telegramUserId, parsed as any)) return;

  if (authService.isAdmin(telegramUserId) && await handleAdminCallbacks(ctx, telegramUserId, parsed as any)) {
    return;
  }

  if (!authService.isAdmin(telegramUserId)) {
    await ctx.answerCallbackQuery({ text: errorTemplate.adminOnly(), show_alert: true });
    return;
  }

  logger.warn('CallbackRouter', `Unhandled callback type=${parsed.type} user=${telegramUserId}`);
}
