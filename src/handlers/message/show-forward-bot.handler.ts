import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { forwardBotConfigService } from '../../services/forward-bot-config.service.js';

export async function showForwardBotHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const username = forwardBotConfigService.getForwardBotUsername();
  if (!username) {
    await ctx.reply('当前未配置转存 Bot。\n\n可使用：\n/set_forward_bot @example_bot');
    return;
  }

  await ctx.reply(`当前转存 Bot：${username}`);
}
