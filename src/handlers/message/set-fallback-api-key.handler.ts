import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';

export async function setFallbackApiKeyHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const text = ctx.message?.text ?? '';
  const raw = text.replace(/^\/set_fallback_api_key\s*/i, '').trim();
  if (!raw) {
    await ctx.reply('参数错误。\n\n示例：\n/set_fallback_api_key fallback_key');
    return;
  }

  const saved = apiKeyConfigService.setFallbackApiKey(raw);
  if (!saved) {
    await ctx.reply('兜底 API Key 不能为空。\n\n示例：\n/set_fallback_api_key fallback_key');
    return;
  }

  await ctx.reply('✅ 兜底 API Key 已更新');
}
