import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { botUserService } from '../../services/bot-user.service.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { logger } from '../../utils/logger.js';
import type { AddBotUserInput } from '../../types/bot.js';

export async function userAddHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;

  if (!authService.isAdmin(telegramUserId)) {
    logger.warn('UserAddHandler', `Non-admin user=${telegramUserId}`);
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const text = ctx.message?.text ?? '';
  const arg = text.replace(/^\/user_add\s*/i, '').trim();

  // 支持两种来源：
  // 1. 显式参数 /user_add <telegram_user_id>
  // 2. 回复目标用户的某条消息（无参数时回退到 reply_to_message.from）
  let targetId: string | null = null;
  let username: string | undefined;
  let firstName: string | undefined;
  let lastName: string | undefined;

  if (arg && /^\d+$/.test(arg)) {
    targetId = arg;
    // 如果命令本身是 reply，且 reply 目标就是同一个用户，顺便抓取元信息
    const replyFrom = ctx.message?.reply_to_message?.from;
    if (replyFrom && replyFrom.id.toString() === arg) {
      username = replyFrom.username;
      firstName = replyFrom.first_name;
      lastName = replyFrom.last_name;
    }
  } else if (!arg && ctx.message?.reply_to_message?.from) {
    const replyFrom = ctx.message.reply_to_message.from;
    targetId = replyFrom.id.toString();
    username = replyFrom.username;
    firstName = replyFrom.first_name;
    lastName = replyFrom.last_name;
  }

  if (!targetId) {
    await ctx.reply(errorTemplate.badParam('/user_add 123456789\n或回复目标用户的某条消息后发送 /user_add'));
    return;
  }

  logger.info('UserAddHandler', `admin=${telegramUserId} target=${targetId} username=${username ?? '-'}`);
  const input: AddBotUserInput = { telegramUserId: targetId, username, firstName, lastName };
  const result = botUserService.addUser(input);

  if (!result.success) {
    logger.warn('UserAddHandler', `target=${targetId} already_exists`);
    await ctx.reply(adminTemplate.buildUserAlreadyExists().text, { parse_mode: 'HTML' });
    return;
  }

  await ctx.reply(adminTemplate.buildUserAddResult(targetId).text, { parse_mode: 'HTML' });
}
