import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';

export async function delFallbackApiKeyHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  apiKeyConfigService.clearFallbackApiKey();
  const r = adminTemplate.buildApiKeyReply({
    title: '已清空兜底 Key',
    status: 'ok',
  });
  await ctx.reply(r.text, { parse_mode: 'HTML' });
}
