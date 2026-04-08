import type { Context } from 'grammy';
import { parseCallbackData } from '../../utils/callback-data.js';
import { authService } from '../../services/auth.service.js';
import { sessionService } from '../../services/session.service.js';
import { searchService } from '../../services/search.service.js';
import { unlockService } from '../../services/unlock.service.js';
import { accountService } from '../../services/account.service.js';
import { quotaService } from '../../services/quota.service.js';
import { botUserService } from '../../services/bot-user.service.js';
import { searchTemplate } from '../../templates/search.template.js';
import { detailTemplate } from '../../templates/detail.template.js';
import { unlockTemplate } from '../../templates/unlock.template.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { helpTemplate } from '../../templates/help.template.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId, isPrivateChat } from '../../utils/guards.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { safeEditMessageText } from '../../utils/telegram-safe.js';
import { forwardBotConfigService } from '../../services/forward-bot-config.service.js';
import { apiKeyInspectionService } from '../../services/api-key-inspection.service.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';

export async function callbackRouter(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;

  // 先 ack，避免 Telegram 超时
  await ctx.answerCallbackQuery();

  const identity = authService.resolveIdentity(telegramUserId);
  const parsed = parseCallbackData(data);

  if (!parsed) {
    logger.warn('CallbackRouter', `user=${telegramUserId} unknown callback="${data}"`);
    return;
  }

  logger.info('CallbackRouter', `user=${telegramUserId} type=${parsed.type}`);

  // ── 帮助 ────────────────────────────────────────────
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

  // ── 导航 ────────────────────────────────────────────
  if (parsed.type === 'nav_search') {
    const { text } = searchTemplate.buildSearchEntryMessage();
    await safeEditMessageText(ctx, text);
    return;
  }

  if (parsed.type === 'nav_candidates') {
    const session = sessionService.getCandidateSession(parsed.candidateSessionId);
    if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return;
    }
    const { text, keyboard } = searchTemplate.buildCandidatePickerMessage(parsed.candidateSessionId, session.candidates);
    await safeEditMessageText(ctx, text, { reply_markup: keyboard });
    return;
  }

  // ── 权限：以下所有操作需要白名单 ─────────────────────────
  if (!identity) {
    await ctx.reply(errorTemplate.noPermission());
    return;
  }

  // ── 搜索候选选择 ────────────────────────────────────
  if (parsed.type === 'pick') {
    const { sessionId, candidateIndex } = parsed;
    const session = sessionService.getCandidateSession(sessionId);
      if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return;
    }

    const candidate = session.candidates[candidateIndex];
    if (!candidate) {
      await safeEditMessageText(ctx, errorTemplate.invalidCandidateSelection());
      return;
    }

    await safeEditMessageText(ctx, '📚 正在拉取资源列表，请稍候...');

    try {
      const rawItems = await searchService.searchResourcesByCandidate(candidate);
      await safeEditMessageText(ctx, '💾 正在识别 115 网盘资源，请稍候...');
      const enriched = await searchService.ensurePanTypesForPage(rawItems, 1, 10);
      const items = enriched.items;
      logger.info('CallbackRouter', `user=${telegramUserId} pick candidate="${candidate.title}" resources=${items.length}`);
      if (!items.length) {
        await safeEditMessageText(ctx, errorTemplate.noResource());
        return;
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
      const candidateTitle = `${candidate.title}${candidate.year ? ` (${candidate.year})` : ''}`;
      const candidateTypeLabel = candidate.mediaType === 'movie' ? '🎬 电影' : '📺 剧集';
      const isPrivate = isPrivateChat(ctx);
      const { text, keyboard } = searchTemplate.buildResultListMessage(resultSessionId, sessionId, candidateTitle, candidateTypeLabel, presentation, isPrivate);
      await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (err) {
      logger.error('CallbackRouter', `user=${telegramUserId} pick error`, err);
      await safeEditMessageText(ctx, errorTemplate.hdhiveUnavailable());
    }
    return;
  }

  // ── 分页 ────────────────────────────────────────────
  if (parsed.type === 'page') {
    const { sessionId, page } = parsed;
    let session = sessionService.getResultSession(sessionId);
    if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return;
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
      await safeEditMessageText(ctx, errorTemplate.noResource());
      return;
    }
    const candidateTitle = `${session.candidate.title}${session.candidate.year ? ` (${session.candidate.year})` : ''}`;
    const candidateTypeLabel = session.candidate.mediaType === 'movie' ? '🎬 电影' : '📺 剧集';
    const isPrivate = isPrivateChat(ctx);
    const { text, keyboard } = searchTemplate.buildResultListMessage(sessionId, session.candidateSessionId, candidateTitle, candidateTypeLabel, presentation, isPrivate);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return;
  }

  if (parsed.type === 'toggle_ali') {
    const { sessionId } = parsed;
    let session = sessionService.getResultSession(sessionId);
    if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return;
    }

    const updated = sessionService.updateResultSession(sessionId, (s) => ({
      ...s,
      viewMode: 'aliyun',
    }));
    if (updated) session = updated;

    const presentation = await searchService.buildPagePresentation(session.items, 1, session.pageSize, 'aliyun');
    const candidateTitle = `${session.candidate.title}${session.candidate.year ? ` (${session.candidate.year})` : ''}`;
    const candidateTypeLabel = session.candidate.mediaType === 'movie' ? '🎬 电影' : '📺 剧集';
    const isPrivate = isPrivateChat(ctx);
    const { text, keyboard } = searchTemplate.buildResultListMessage(sessionId, session.candidateSessionId, candidateTitle, candidateTypeLabel, presentation, isPrivate, true);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return;
  }

  if (parsed.type === 'toggle_115') {
    const { sessionId, page } = parsed;
    let session = sessionService.getResultSession(sessionId);
    if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return;
    }

    const updated = sessionService.updateResultSession(sessionId, (s) => ({
      ...s,
      viewMode: '115',
    }));
    if (updated) session = updated;

    const presentation = await searchService.buildPagePresentation(session.items, page, session.pageSize, '115');
    const candidateTitle = `${session.candidate.title}${session.candidate.year ? ` (${session.candidate.year})` : ''}`;
    const candidateTypeLabel = session.candidate.mediaType === 'movie' ? '🎬 电影' : '📺 剧集';
    const isPrivate = isPrivateChat(ctx);
    const { text, keyboard } = searchTemplate.buildResultListMessage(sessionId, session.candidateSessionId, candidateTitle, candidateTypeLabel, presentation, isPrivate);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return;
  }

  // ── 详情 ────────────────────────────────────────────
  if (parsed.type === 'detail') {
    const { sessionId, slug, page } = parsed;
    const session = sessionService.getResultSession(sessionId);
    if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return;
    }

    const card = session.items.find(item => item.slug === slug);
    if (!card) {
      await safeEditMessageText(ctx, errorTemplate.invalidResourceSelection());
      return;
    }

    const isPrivate = isPrivateChat(ctx);
    const { text, keyboard } = detailTemplate.buildResourceDetailMessage(card, sessionId, page, isPrivate);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return;
  }

  // ── 解锁 ────────────────────────────────────────────
  if (parsed.type === 'unlock') {
    const { slug, sessionId, page } = parsed;

    await safeEditMessageText(ctx, '正在解锁，请稍候...');
    const result = await unlockService.unlock(slug);
    logger.info('CallbackRouter', `user=${telegramUserId} unlock slug=${slug} status=${result.status}`);
    const forwardBotUsername = forwardBotConfigService.getForwardBotUsername();
    const { text, keyboard } = unlockTemplate.buildUnlockResultMessage(result, sessionId, page, forwardBotUsername);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return;
  }

  if (parsed.type === 'forward_bot_open') {
    const forwardBotUsername = forwardBotConfigService.getForwardBotUsername();
    if (!identity) {
      await ctx.answerCallbackQuery({ text: '你是什么档次？', show_alert: true });
      return;
    }
    if (!forwardBotUsername) {
      await ctx.answerCallbackQuery({ text: '当前未配置转存Bot', show_alert: true });
      return;
    }

    const { text, keyboard } = unlockTemplate.buildForwardBotJumpMessage(parsed.sessionId, parsed.page, forwardBotUsername);
    await safeEditMessageText(ctx, text, { reply_markup: keyboard });
    return;
  }

  // ── 返回列表 ─────────────────────────────────────────
  if (parsed.type === 'nav_back') {
    const { sessionId, page } = parsed;
    let session = sessionService.getResultSession(sessionId);
    if (!session) {
      await safeEditMessageText(ctx, errorTemplate.sessionExpired());
      return;
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
      await safeEditMessageText(ctx, errorTemplate.noResource());
      return;
    }
    const candidateTitle = `${session.candidate.title}${session.candidate.year ? ` (${session.candidate.year})` : ''}`;
    const candidateTypeLabel = session.candidate.mediaType === 'movie' ? '🎬 电影' : '📺 剧集';
    const isPrivate = isPrivateChat(ctx);
    const { text, keyboard } = searchTemplate.buildResultListMessage(sessionId, session.candidateSessionId, candidateTitle, candidateTypeLabel, presentation, isPrivate);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return;
  }

  // ── 管理员操作 ────────────────────────────────────────
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  if (parsed.type === 'admin_me') {
    try {
      const snapshot = await accountService.getAccountSnapshot();
      const { text, keyboard } = adminTemplate.buildMeMessage(snapshot);
      await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (err) {
      logger.error('CallbackRouter', `admin_me error`, err);
      await ctx.reply(errorTemplate.generic());
    }
    return;
  }

  if (parsed.type === 'admin_quota') {
    try {
      const snapshot = await quotaService.getQuotaSnapshot();
      const { text, keyboard } = adminTemplate.buildQuotaMessage(snapshot);
      await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (err) {
      logger.error('CallbackRouter', `admin_quota error`, err);
      await ctx.reply(errorTemplate.generic());
    }
    return;
  }

  if (parsed.type === 'admin_users') {
    const users = botUserService.listUsers();
    const { text, keyboard } = adminTemplate.buildUserListMessage(users);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return;
  }

  if (parsed.type === 'admin_api_key') {
    const status = await apiKeyInspectionService.buildStatusWithLevels();
    const { text, keyboard } = adminTemplate.buildApiKeyStatusMessage(status);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return;
  }
}
