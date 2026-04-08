import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';

export async function setActiveApiKeyHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const text = ctx.message?.text ?? '';
  const raw = text.replace(/^\/set_active_api_key\s*/i, '').trim();
  const index = Number(raw);
  if (!Number.isInteger(index) || index < 1) {
    await ctx.reply('参数错误。\n\n示例：\n/set_active_api_key 1');
    return;
  }

  const selected = apiKeyConfigService.setActiveKeyByIndex(index - 1);
  if (!selected) {
    await ctx.reply('无效序号，请先使用 /show_api_key 查看主 Key 列表。');
    return;
  }

  await ctx.reply(`✅ 当前 Active Key 已切换为第 ${index} 个，并已回写 .env DEFAULT_API_KEY`);
}
