import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';

export async function setApiKeyHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const text = ctx.message?.text ?? '';
  const raw = text.replace(/^\/set_api_key\s*/i, '').trim();
  if (!raw) {
    const r = adminTemplate.buildApiKeyBadParam('/set_api_key key_a,key_b,key_c');
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const result = apiKeyConfigService.setPrimaryApiKeys(raw);
  if (!result.ok) {
    const r = adminTemplate.buildApiKeyReply({
      title: '主 Key 设置失败',
      status: 'err',
      detailLines: ['原因：未能解析出任何非空 Key。'],
      hint: '请使用英文逗号或换行分隔多把 Key。',
    });
    await ctx.reply(r.text, { parse_mode: 'HTML' });
    return;
  }

  const r = adminTemplate.buildApiKeyReply({
    title: 'HDHive 主 Key 已更新',
    status: 'ok',
    detailLines: [
      `主 Key 数量　<b>${result.keys.length}</b>`,
      `当前生效　${result.keys.length} 把顺序轮询`,
      '已同步回写 <code>.env</code> 的 <code>DEFAULT_API_KEY</code>（仅首把，作冷启动兜底）',
    ],
  });
  await ctx.reply(r.text, { parse_mode: 'HTML' });
}
