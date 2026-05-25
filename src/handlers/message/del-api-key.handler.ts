import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';

export async function delApiKeyHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const text = ctx.message?.text ?? '';
  const raw = text.replace(/^\/del_api_key\s*/i, '').trim();
  const index = Number(raw);

  if (!Number.isInteger(index) || index < 1) {
    const r = adminTemplate.buildApiKeyBadParam('/del_api_key 1');
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const result = apiKeyConfigService.deletePrimaryKeyByIndex(index - 1);
  if (!result) {
    const r = adminTemplate.buildApiKeyReply({
      title: '删除失败',
      status: 'err',
      detailLines: ['原因：序号不存在，或至少需保留 1 把主 Key。'],
    });
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const r = adminTemplate.buildApiKeyReply({
    title: `已删除第 ${index} 把主 Key`,
    status: 'ok',
    detailLines: [`剩余主 Key 数量　<b>${result.remainingCount}</b>`],
  });
  await ctx.reply(r.text, { parse_mode: 'HTML' });
}
