import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { searchService } from '../../services/search.service.js';
import { sessionService } from '../../services/session.service.js';
import { searchTemplate } from '../../templates/search.template.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId, isPrivateChat } from '../../utils/guards.js';
import { logger } from '../../utils/logger.js';
import axios from 'axios';
import { safeEditChatMessageText } from '../../utils/telegram-safe.js';
import type { TmdbCandidate } from '../../types/resource.js';

export async function runSearch(ctx: Context, keyword: string) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;

  const identity = authService.resolveIdentity(telegramUserId);
  if (!identity) {
    logger.warn('SearchHandler', `Unauthorized user=${telegramUserId}`);
    await ctx.reply(errorTemplate.noPermission());
    return;
  }

  if (!keyword) {
    await ctx.reply(errorTemplate.noKeyword());
    return;
  }

  logger.info('SearchHandler', `user=${telegramUserId} keyword="${keyword}"`);
  const searching = await ctx.reply('🔎 正在搜索影视条目，请稍候...');

  try {
    const candidates = await searchService.searchCandidates(keyword);
    logger.info('SearchHandler', `user=${telegramUserId} keyword="${keyword}" candidates=${candidates.length}`);

    if (!candidates.length) {
      await safeEditChatMessageText(ctx, ctx.chat!.id, searching.message_id, errorTemplate.noCandidate());
      return;
    }

    const sessionId = sessionService.createCandidateSession({
      telegramUserId,
      query: keyword,
      candidates,
    });

    const { text: msgText, keyboard } = searchTemplate.buildCandidatePickerMessage(sessionId, candidates);
    await safeEditChatMessageText(ctx, ctx.chat!.id, searching.message_id, msgText, {
      reply_markup: keyboard,
    });
  } catch (err) {
    logger.error('SearchHandler', `user=${telegramUserId} keyword="${keyword}"`, err);
    const message = axios.isAxiosError(err)
      ? errorTemplate.tmdbUnavailable()
      : errorTemplate.generic();
    await safeEditChatMessageText(ctx, ctx.chat!.id, searching.message_id, message);
  }
}

export async function runSearchByCandidate(ctx: Context, candidate: TmdbCandidate) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;

  const identity = authService.resolveIdentity(telegramUserId);
  if (!identity) {
    await ctx.reply(errorTemplate.noPermission());
    return;
  }

  const loading = await ctx.reply('📚 正在拉取资源列表，请稍候...');

  try {
    const rawItems = await searchService.searchResourcesByCandidate(candidate);
    await safeEditChatMessageText(ctx, ctx.chat!.id, loading.message_id, '💾 正在识别 115 网盘资源，请稍候...');

    const enriched = await searchService.ensurePanTypesForPage(rawItems, 1, 10);
    const items = enriched.items;
    if (!items.length) {
      await safeEditChatMessageText(ctx, ctx.chat!.id, loading.message_id, errorTemplate.noResource());
      return;
    }

    const candidateSessionId = sessionService.createCandidateSession({
      telegramUserId,
      query: candidate.title,
      candidates: [candidate],
    });

    const resultSessionId = sessionService.createResultSession({
      telegramUserId,
      query: candidate.title,
      candidate,
      candidateSessionId,
      items,
      pageSize: 10,
      enrichedUntil: enriched.enrichedUntil,
      panTypeReady: enriched.ready,
      viewMode: '115',
    });

    const presentation = await searchService.buildPagePresentation(items, 1, 10, '115');
    const candidateTitle = `${candidate.title}${candidate.year ? ` (${candidate.year})` : ''}`;
    const candidateTypeLabel = candidate.mediaType === 'movie' ? '🎬 电影' : '📺 剧集';
    const isPrivate = isPrivateChat(ctx);
    const { text, keyboard } = searchTemplate.buildResultListMessage(resultSessionId, candidateSessionId, candidateTitle, candidateTypeLabel, presentation, isPrivate);
    await safeEditChatMessageText(ctx, ctx.chat!.id, loading.message_id, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } catch (err) {
    logger.error('SearchHandler', `user=${telegramUserId} candidateSearch="${candidate.title}"`, err);
    await safeEditChatMessageText(ctx, ctx.chat!.id, loading.message_id, errorTemplate.hdhiveUnavailable());
  }
}

export async function searchHandler(ctx: Context) {
  const text = ctx.message?.text ?? '';
  const keyword = text.replace(/^\/search\s*/i, '').replace(/\s+/g, ' ').trim();
  await runSearch(ctx, keyword);
}

export async function keywordMessageHandler(ctx: Context) {
  const text = (ctx.message?.text ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return;
  if (text.startsWith('/')) return;
  await runSearch(ctx, text);
}
