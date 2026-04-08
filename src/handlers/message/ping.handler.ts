import type { Context } from 'grammy';
import { getTelegramUserId } from '../../utils/guards.js';
import { authService } from '../../services/auth.service.js';
import { logger } from '../../utils/logger.js';

export async function pingHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;

  const identity = authService.resolveIdentity(telegramUserId);
  logger.info('PingHandler', `user=${telegramUserId} identity=${identity?.role ?? 'GUEST'}`);

  await ctx.reply(`pong\nuser=${telegramUserId}\nrole=${identity?.role ?? 'GUEST'}`);
}
