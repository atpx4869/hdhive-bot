import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { forwardBotConfigService } from '../../services/forward-bot-config.service.js';

export async function setForwardBotHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const text = ctx.message?.text ?? '';
  const raw = text.replace(/^\/set_forward_bot\s*/i, '').trim();
  if (!raw) {
    await ctx.reply('参数错误。\n\n示例：\n/set_forward_bot @example_bot');
    return;
  }

  const saved = forwardBotConfigService.setForwardBotUsername(raw);
  if (!saved) {
    await ctx.reply('Bot 用户名格式无效。\n\n示例：\n/set_forward_bot @example_bot');
    return;
  }

  await ctx.reply(`✅ 转存 Bot 已更新\n\n当前：${saved}`);
}
