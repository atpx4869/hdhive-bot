import type { Context } from 'grammy';
import { sessionService } from '../../services/session.service.js';
import { searchService } from '../../services/search.service.js';
import { searchTemplate } from '../../templates/search.template.js';
import { detailTemplate } from '../../templates/detail.template.js';
import { errorTemplate } from '../../templates/error.template.js';
import { logger } from '../../utils/logger.js';
import { safeEditMessageText } from '../../utils/telegram-safe.js';
import { isPrivateChat } from '../../utils/guards.js';
import type { ParsedCallback } from '../../types/callback.js';

function candidateTitleParts(candidate: { title: string; year?: string | undefined; mediaType: 'movie' | 'tv' }) {
  return {
    title: `${candidate.title}${candidate.year ? ` (${candidate.year})` : ''}`,
    label: candidate.mediaType === 'movie' ? '🎬 电影' : '📺 剧集',
  };
}

export async function handleSearchCallbacks(
  ctx: Context,
  telegramUserId: string,
  parsed: Extract<ParsedCallback, { type: 'pick' | 'page' | 'toggle_ali' | 'toggle_115' | 'detail' | 'nav_back' | 'nav_search' | 'nav_candidates' }>,
): Promise<boolean> {
  if (parsed.type === 'nav_search') {
    const { text } = searchTemplate.buildSearchEntryMessage();
    await safeEditMessageText(ctx, text);
    return true;
  }

  if (parsed.type === 'nav_candidates') {
    const session = sessionService.getCandidateSession(parsed.candidateSessionId);
    if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return true;
    }
    const { text, keyboard } = searchTemplate.buildCandidatePickerMessage(parsed.candidateSessionId, session.candidates);
    await safeEditMessageText(ctx, text, { reply_markup: keyboard });
    return true;
  }

  if (parsed.type === 'pick') {
    const { sessionId, candidateIndex } = parsed;
    const session = sessionService.getCandidateSession(sessionId);
    if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return true;
    }

    const candidate = session.candidates[candidateIndex];
    if (!candidate) {
      await safeEditMessageText(ctx, errorTemplate.invalidCandidateSelection());
      return true;
    }

    await safeEditMessageText(ctx, '📚 正在拉取资源列表，请稍候...');
    try {
      const rawItems = await searchService.searchResourcesByCandidate(candidate);
      await safeEditMessageText(ctx, '💾 正在识别 115 网盘资源，请稍候...');
      const enriched = await searchService.ensurePanTypesForPage(rawItems, 1, 10);
      const items = enriched.items;
      logger.info('SearchCallbacks', `user=${telegramUserId} pick candidate="${candidate.title}" resources=${items.length}`);
      if (!items.length) {
        await safeEditMessageText(ctx, '当前条目暂无可用资源。\n\n请返回重新选择其他候选条目。');
        return true;
      }

      const resultSessionId = sessionService.createResultSession({
        telegramUserId,
        query: session.query,
        candidate,
        candidateSessionId: sessionId,
        items,
        pageSize: 10,
        enrichedUntil: enriched.enrichedUntil,
        panTypeReady: enriched.ready,
        viewMode: '115',
      });

      const presentation = await searchService.buildPagePresentation(items, 1, 10, '115');
      const { title, label } = candidateTitleParts(candidate);
      const { text, keyboard } = searchTemplate.buildResultListMessage(resultSessionId, sessionId, title, label, presentation, isPrivateChat(ctx));
      await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (err) {
      logger.error('SearchCallbacks', `user=${telegramUserId} pick error`, err);
      await safeEditMessageText(ctx, errorTemplate.hdhiveUnavailable());
    }

    return true;
  }

  if (parsed.type === 'page') {
    const { sessionId, page } = parsed;
    let session = sessionService.getResultSession(sessionId);
    if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return true;
    }

    if (!session.panTypeReady) {
      await safeEditMessageText(ctx, `💾 正在补充识别第 ${page} 页资源，请稍候...`);
      const ensured = await searchService.ensurePanTypesForPage(session.items, page, session.pageSize);
      const updated = sessionService.updateResultSession(sessionId, (s) => ({
        ...s,
        items: ensured.items,
        enrichedUntil: ensured.enrichedUntil,
        panTypeReady: ensured.ready,
      }));
      if (updated) session = updated;
    }

    const currentMode = session.viewMode ?? '115';
    const presentation = await searchService.buildPagePresentation(session.items, page, session.pageSize, currentMode);
    const visibleItems = currentMode === 'aliyun' ? presentation.aliItems : presentation.shown115Items;
    if (!visibleItems.length && presentation.totalAliCount === 0) {
      await safeEditMessageText(ctx, '当前页无可用资源，可返回上一页或其他候选条目。');
      return true;
    }

    const { title, label } = candidateTitleParts(session.candidate);
    const { text, keyboard } = searchTemplate.buildResultListMessage(sessionId, session.candidateSessionId, title, label, presentation, isPrivateChat(ctx));
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return true;
  }

  if (parsed.type === 'toggle_ali') {
    const { sessionId } = parsed;
    let session = sessionService.getResultSession(sessionId);
    if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return true;
    }

    const updated = sessionService.updateResultSession(sessionId, (s) => ({ ...s, viewMode: 'aliyun' }));
    if (updated) session = updated;

    const presentation = await searchService.buildPagePresentation(session.items, 1, session.pageSize, 'aliyun');
    const { title, label } = candidateTitleParts(session.candidate);
    const { text, keyboard } = searchTemplate.buildResultListMessage(sessionId, session.candidateSessionId, title, label, presentation, isPrivateChat(ctx), true);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return true;
  }

  if (parsed.type === 'toggle_115') {
    const { sessionId, page } = parsed;
    let session = sessionService.getResultSession(sessionId);
    if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return true;
    }

    const updated = sessionService.updateResultSession(sessionId, (s) => ({ ...s, viewMode: '115' }));
    if (updated) session = updated;

    const presentation = await searchService.buildPagePresentation(session.items, page, session.pageSize, '115');
    const { title, label } = candidateTitleParts(session.candidate);
    const { text, keyboard } = searchTemplate.buildResultListMessage(sessionId, session.candidateSessionId, title, label, presentation, isPrivateChat(ctx));
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return true;
  }

  if (parsed.type === 'detail') {
    const { sessionId, slug, page } = parsed;
    const session = sessionService.getResultSession(sessionId);
    if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return true;
    }

    const card = session.items.find((item) => item.slug === slug);
    if (!card) {
      await safeEditMessageText(ctx, errorTemplate.invalidResourceSelection());
      return true;
    }

    const { text, keyboard } = detailTemplate.buildResourceDetailMessage(card, sessionId, page, isPrivateChat(ctx));
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return true;
  }

  if (parsed.type === 'nav_back') {
    const { sessionId, page } = parsed;
    let session = sessionService.getResultSession(sessionId);
    if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return true;
    }

    if (!session.panTypeReady) {
      await safeEditMessageText(ctx, `💾 正在恢复第 ${page} 页资源视图，请稍候...`);
      const ensured = await searchService.ensurePanTypesForPage(session.items, page, session.pageSize);
      const updated = sessionService.updateResultSession(sessionId, (s) => ({
        ...s,
        items: ensured.items,
        enrichedUntil: ensured.enrichedUntil,
        panTypeReady: ensured.ready,
      }));
      if (updated) session = updated;
    }

    const currentMode = session.viewMode ?? '115';
    const presentation = await searchService.buildPagePresentation(session.items, page, session.pageSize, currentMode);
    const visibleItems = currentMode === 'aliyun' ? presentation.aliItems : presentation.shown115Items;
    if (!visibleItems.length && presentation.totalAliCount === 0) {
      await safeEditMessageText(ctx, '返回后当前页无可展示资源，建议翻页或重新选择条目。');
      return true;
    }

    const { title, label } = candidateTitleParts(session.candidate);
    const { text, keyboard } = searchTemplate.buildResultListMessage(sessionId, session.candidateSessionId, title, label, presentation, isPrivateChat(ctx));
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return true;
  }

  return false;
}
