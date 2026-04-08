import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { inlineService } from '../../services/inline.service.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { logger } from '../../utils/logger.js';

export async function inlineQueryHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) {
    logger.warn('InlineHandler', 'No telegramUserId found in inline query');
    const notice = inlineService.buildNoticeResult('unauthorized');
    await ctx.answerInlineQuery(notice.results, { cache_time: 0 });
    return;
  }

  const identity = authService.resolveIdentity(telegramUserId);
  if (!identity) {
    logger.warn('InlineHandler', `Unauthorized inline user=${telegramUserId}`);
    const notice = inlineService.buildNoticeResult('unauthorized');
    await ctx.answerInlineQuery(notice.results, { cache_time: 0, is_personal: true });
    return;
  }

  const query = ctx.inlineQuery?.query?.trim() ?? '';
  if (!query || query.length < 2) {
    logger.info('InlineHandler', `Ignored short inline query user=${telegramUserId} query="${query}"`);
    const notice = inlineService.buildNoticeResult('short_query');
    await ctx.answerInlineQuery(notice.results, { cache_time: 0, is_personal: true });
    return;
  }

  const offset = ctx.inlineQuery?.offset ?? '';
  logger.info('InlineHandler', `user=${telegramUserId} query="${query}" offset="${offset}"`);

  try {
    const { results, nextOffset } = await inlineService.searchInline(query, offset, telegramUserId);
    logger.info('InlineHandler', `user=${telegramUserId} inline results=${results.length} nextOffset="${nextOffset}"`);
    await ctx.answerInlineQuery(results, {
      next_offset: nextOffset,
      cache_time: 60,
      is_personal: true,
    });
  } catch (err) {
    logger.error('InlineHandler', `user=${telegramUserId} query="${query}"`, err);
    const notice = inlineService.buildNoticeResult('error');
    await ctx.answerInlineQuery(notice.results, { cache_time: 0, is_personal: true });
  }
}
