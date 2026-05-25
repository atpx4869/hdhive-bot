import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { adminTemplate } from '../../templates/admin.template.js';
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
    const r = adminTemplate.buildApiKeyBadParam('/set_active_api_key 1');
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const selected = apiKeyConfigService.setActiveKeyByIndex(index - 1);
  if (!selected) {
    const r = adminTemplate.buildApiKeyReply({
      title: '切换失败',
      status: 'err',
      detailLines: ['原因：序号不存在。'],
      hint: '请先使用 /show_api_key 查看主 Key 列表。',
    });
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const r = adminTemplate.buildApiKeyReply({
    title: `Active Key 已切换为第 ${index} 把`,
    status: 'ok',
    hint: '仅切换 sqlite 中的 Active 标记，不会改写 .env 冷启动兜底。',
  });
  await ctx.reply(r.text, { parse_mode: 'HTML' });
}
