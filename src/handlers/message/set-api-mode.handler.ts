import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { adminTemplate } from '../../templates/admin.template.js';
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
    const r = adminTemplate.buildApiKeyBadParam('/set_api_mode auto\n/set_api_mode manual');
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  apiKeyConfigService.setMode(raw);
  const label = raw === 'auto' ? '自动故障转移（首 Key 优先，失败自动切下一把/兜底）' : '手动切换（仅使用 Active Key）';
  const r = adminTemplate.buildApiKeyReply({
    title: 'API Key 模式已切换',
    status: 'ok',
    detailLines: [`当前模式　<b>${label}</b>`],
  });
  await ctx.reply(r.text, { parse_mode: 'HTML' });
}
