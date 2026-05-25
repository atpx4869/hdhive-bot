import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { adminTemplate } from '../../templates/admin.template.js';
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
    const r = adminTemplate.buildApiKeyBadParam('/set_fallback_api_key fallback_key');
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const saved = apiKeyConfigService.setFallbackApiKey(raw);
  if (!saved) {
    const r = adminTemplate.buildApiKeyReply({
      title: '兜底 API Key 设置失败',
      status: 'err',
      detailLines: ['原因：Key 不能为空。'],
    });
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const r = adminTemplate.buildApiKeyReply({
    title: '兜底 API Key 已更新',
    status: 'ok',
  });
  await ctx.reply(r.text, { parse_mode: 'HTML' });
}
