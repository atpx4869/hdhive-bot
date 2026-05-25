import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';

export async function replaceApiKeyHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const text = ctx.message?.text ?? '';
  const raw = text.replace(/^\/replace_api_key\s*/i, '').trim();
  const parts = raw.split(/\s+/u);
  const index = Number(parts.shift());
  const newKey = parts.join(' ').trim();

  if (!Number.isInteger(index) || index < 1 || !newKey) {
    const r = adminTemplate.buildApiKeyBadParam('/replace_api_key 1 新key内容');
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const result = apiKeyConfigService.replacePrimaryKeyByIndex(index - 1, newKey);
  if (!result) {
    const r = adminTemplate.buildApiKeyReply({
      title: '替换失败',
      status: 'err',
      detailLines: ['原因：序号不存在或新 Key 无效。'],
    });
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const r = adminTemplate.buildApiKeyReply({
    title: `已替换第 ${index} 把主 Key`,
    status: 'ok',
  });
  await ctx.reply(r.text, { parse_mode: 'HTML' });
}
