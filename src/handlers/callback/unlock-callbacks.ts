import type { Context } from 'grammy';
import { unlockService } from '../../services/unlock.service.js';
import { authService } from '../../services/auth.service.js';
import { forwardBotConfigService } from '../../services/forward-bot-config.service.js';
import { unlockTemplate } from '../../templates/unlock.template.js';
import { logger } from '../../utils/logger.js';
import { safeEditMessageText } from '../../utils/telegram-safe.js';
import type { ParsedCallback } from '../../types/callback.js';

export async function handleUnlockCallbacks(
  ctx: Context,
  telegramUserId: string,
  parsed: Extract<ParsedCallback, { type: 'unlock' }>,
): Promise<boolean> {
  const { slug, sessionId, page } = parsed;

  await safeEditMessageText(ctx, '正在解锁，请稍候...');
  const result = await unlockService.unlock(slug);
  logger.info('UnlockCallbacks', `user=${telegramUserId} unlock slug=${slug} status=${result.status}`);

  const forwardBotUsername = authService.isAdmin(telegramUserId)
    ? forwardBotConfigService.getForwardBotUsername()
    : null;

  const { text, keyboard } = unlockTemplate.buildUnlockResultMessage(result, sessionId, page, forwardBotUsername);
  await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
  return true;
}
