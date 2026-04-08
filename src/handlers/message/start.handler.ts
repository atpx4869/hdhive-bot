import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { startTemplate } from '../../templates/start.template.js';
import { env } from '../../config/env.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { logger } from '../../utils/logger.js';
import { runSearchByCandidate } from './search.handler.js';
import type { TmdbCandidate } from '../../types/resource.js';

export async function startHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) {
    logger.warn('StartHandler', 'No telegramUserId found in ctx');
    return;
  }

  const identity = authService.resolveIdentity(telegramUserId);
  logger.info('StartHandler', `user=${telegramUserId} identity=${identity?.role ?? 'GUEST'}`);

  const messageText = ctx.message?.text ?? '';
  const deepArg = messageText.replace(/^\/start\s*/i, '').trim();

  const match = deepArg.match(/^pick_(movie|tv)_(\d+)(?:_(\d{4}))?_(.+)$/u);
  if (match && identity) {
    const mediaType = match[1] as 'movie' | 'tv';
    const tmdbId = match[2]!;
    const year = match[3] || undefined;
    const title = decodeURIComponent(match[4]!);
    const candidate: TmdbCandidate = {
      mediaType,
      tmdbId,
      title,
      year,
    };
    await runSearchByCandidate(ctx, candidate);
    return;
  }

  if (!identity) {
    const { text } = startTemplate.buildGuestMessage();
    await ctx.reply(text);
    return;
  }

  if (identity.role === 'ADMIN') {
    const { text, keyboard } = startTemplate.buildAdminMessage();
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    return;
  }

  const { text, keyboard } = startTemplate.buildUserMessage(env.BOT_USERNAME);
  await ctx.reply(text, { reply_markup: keyboard });
}
