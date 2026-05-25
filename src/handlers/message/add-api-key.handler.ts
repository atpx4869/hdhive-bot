import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';

export async function addApiKeyHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const text = ctx.message?.text ?? '';
  const raw = text.replace(/^\/add_api_key\s*/i, '').trim();
  if (!raw) {
    const r = adminTemplate.buildApiKeyBadParam('/add_api_key abcd1234efgh5678');
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const result = apiKeyConfigService.addPrimaryKey(raw);
  if (!result) {
    const r = adminTemplate.buildApiKeyReply({
      title: '添加失败',
      status: 'err',
      detailLines: ['原因：Key 为空或已存在于主列表中。'],
    });
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const r = adminTemplate.buildApiKeyReply({
    title: '已添加主 Key',
    status: 'ok',
    detailLines: [`当前主 Key 数量　<b>${result.totalCount}</b>`],
    hint: '仅当首把变化时才会回写 .env 冷启动兜底。',
  });
  await ctx.reply(r.text, { parse_mode: 'HTML' });
}
