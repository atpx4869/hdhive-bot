import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';

export async function setApiModeHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const text = ctx.message?.text ?? '';
  const raw = text.replace(/^\/set_api_mode\s*/i, '').trim().toLowerCase();
  if (raw !== 'auto' && raw !== 'manual') {
    await ctx.reply('参数错误。\n\n示例：\n/set_api_mode auto\n/set_api_mode manual');
    return;
  }

  apiKeyConfigService.setMode(raw);
  await ctx.reply(`✅ API Key 模式已切换为：${raw === 'auto' ? '自动轮转' : '手动切换'}`);
}
