import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';

export async function setApiKeyNoteHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const text = ctx.message?.text ?? '';
  const raw = text.replace(/^\/set_api_key_note\s*/i, '').trim();
  const parts = raw.split(/\s+/u);
  const index = Number(parts.shift());
  const note = parts.join(' ').trim();

  if (!Number.isInteger(index) || index < 1 || !note) {
    const r = adminTemplate.buildApiKeyBadParam('/set_api_key_note 1 生产VIP');
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const saved = apiKeyConfigService.setApiKeyNoteByIndex(index - 1, note);
  if (!saved) {
    const r = adminTemplate.buildApiKeyReply({
      title: '设置备注失败',
      status: 'err',
      detailLines: ['原因：序号不存在。'],
      hint: '请先使用 /show_api_key 查看主 Key 列表。',
    });
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const r = adminTemplate.buildApiKeyReply({
    title: `已为第 ${index} 把 Key 设置备注`,
    status: 'ok',
    detailLines: [`备注内容　<b>${note}</b>`],
  });
  await ctx.reply(r.text, { parse_mode: 'HTML' });
}
