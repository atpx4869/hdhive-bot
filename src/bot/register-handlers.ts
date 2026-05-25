import type { Bot } from 'grammy';
import { startHandler } from '../handlers/message/start.handler.js';
import { keywordMessageHandler, searchHandler } from '../handlers/message/search.handler.js';
import { meHandler } from '../handlers/message/me.handler.js';
import { quotaHandler } from '../handlers/message/quota.handler.js';
import { pingHandler } from '../handlers/message/ping.handler.js';
import { helpHandler } from '../handlers/message/help.handler.js';
import { accountHandler } from '../handlers/message/account.handler.js';
import { userAddHandler } from '../handlers/message/user-add.handler.js';
import { userDelHandler } from '../handlers/message/user-del.handler.js';
import { userListHandler } from '../handlers/message/user-list.handler.js';
import { setForwardBotHandler } from '../handlers/message/set-forward-bot.handler.js';
import { showForwardBotHandler } from '../handlers/message/show-forward-bot.handler.js';
import { setApiKeyHandler } from '../handlers/message/set-api-key.handler.js';
import { showApiKeyHandler } from '../handlers/message/show-api-key.handler.js';
import { setFallbackApiKeyHandler } from '../handlers/message/set-fallback-api-key.handler.js';
import { setApiModeHandler } from '../handlers/message/set-api-mode.handler.js';
import { setActiveApiKeyHandler } from '../handlers/message/set-active-api-key.handler.js';
import { setApiKeyNoteHandler } from '../handlers/message/set-api-key-note.handler.js';
import { addApiKeyHandler } from '../handlers/message/add-api-key.handler.js';
import { delApiKeyHandler } from '../handlers/message/del-api-key.handler.js';
import { replaceApiKeyHandler } from '../handlers/message/replace-api-key.handler.js';
import { delApiKeyNoteHandler } from '../handlers/message/del-api-key-note.handler.js';
import { delFallbackApiKeyHandler } from '../handlers/message/del-fallback-api-key.handler.js';
import { callbackRouter } from '../handlers/callback/callback-router.js';
import { inlineQueryHandler } from '../handlers/inline/inline-query.handler.js';
import { logger } from '../utils/logger.js';
import { authService } from '../services/auth.service.js';
import { errorTemplate } from '../templates/error.template.js';
import { botUserService } from '../services/bot-user.service.js';

export function registerHandlers(bot: Bot) {
  // 全局 update 日志中间件（在所有 handler 之前）
  bot.use(async (ctx, next) => {
    const from = ctx.from;
    const userId = from?.id ?? 'unknown';
    const username = from?.username ? `@${from.username}` : from?.first_name ?? '-';
    const chatType = ctx.chat?.type ?? 'unknown';

    if (ctx.message?.text) {
      logger.info('Update', `[${chatType}] user=${userId}(${username}) text="${ctx.message.text}"`);
    } else if (ctx.callbackQuery?.data) {
      logger.info('Update', `[callback] user=${userId}(${username}) data="${ctx.callbackQuery.data}"`);
    } else if (ctx.inlineQuery) {
      logger.info('Update', `[inline] user=${userId}(${username}) query="${ctx.inlineQuery.query}"`);
    }

    await next();
  });

  // 全局白名单/元信息中间件：
  // 1. 对非命令的自由文本短路游客（避免触发关键词搜索 → HDHive 客户端浪费 API 调用）
  // 2. 对已知白名单用户首次出现的 username/firstName/lastName 自动回填到 sqlite
  bot.use(async (ctx, next) => {
    const from = ctx.from;
    const tgId = from?.id?.toString();
    if (!tgId) {
      await next();
      return;
    }

    const identity = authService.resolveIdentity(tgId);
    const text = ctx.message?.text;
    const isFreeText = typeof text === 'string' && text.length > 0 && !text.startsWith('/');

    // 自由文本：未授权直接拦截
    if (isFreeText && !identity) {
      logger.warn('AuthMiddleware', `block guest free text user=${tgId}`);
      await ctx.reply(errorTemplate.noPermission());
      return;
    }

    // 已知白名单用户：把最新的 Telegram 资料回填到 sqlite（仅当有变化时）
    if (identity && identity.role === 'USER' && from) {
      try {
        botUserService.touchMetadata(tgId, {
          username: from.username,
          firstName: from.first_name,
          lastName: from.last_name,
        });
      } catch (err) {
        logger.warn('AuthMiddleware', `touchMetadata failed user=${tgId}`, err);
      }
    }

    await next();
  });

  // commands
  bot.command('start', startHandler);
  bot.command('search', searchHandler);
  bot.command('help', helpHandler);
  bot.command('ping', pingHandler);
  bot.command('me', meHandler);
  bot.command('quota', quotaHandler);
  bot.command('account', accountHandler);
  bot.command('user_add', userAddHandler);
  bot.command('user_del', userDelHandler);
  bot.command('user_list', userListHandler);
  bot.command('set_forward_bot', setForwardBotHandler);
  bot.command('show_forward_bot', showForwardBotHandler);
  bot.command('set_api_key', setApiKeyHandler);
  bot.command('show_api_key', showApiKeyHandler);
  bot.command('set_fallback_api_key', setFallbackApiKeyHandler);
  bot.command('del_fallback_api_key', delFallbackApiKeyHandler);
  bot.command('set_api_mode', setApiModeHandler);
  bot.command('set_active_api_key', setActiveApiKeyHandler);
  bot.command('set_api_key_note', setApiKeyNoteHandler);
  bot.command('add_api_key', addApiKeyHandler);
  bot.command('del_api_key', delApiKeyHandler);
  bot.command('replace_api_key', replaceApiKeyHandler);
  bot.command('del_api_key_note', delApiKeyNoteHandler);

  // 普通文本消息：直接按关键词搜索（不影响 slash 命令）
  bot.on('message:text', keywordMessageHandler);

  // callback queries
  bot.on('callback_query:data', callbackRouter);

  // inline queries
  bot.on('inline_query', inlineQueryHandler);

  // 全局错误处理
  bot.catch((err) => {
    const ctx = err.ctx;
    const userId = ctx.from?.id ?? 'unknown';
    logger.error('BotError', `user=${userId} update_id=${ctx.update.update_id}`, err.error);
  });
}
