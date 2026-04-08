import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
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
    await ctx.reply('参数错误。\n\n示例：\n/set_api_key_note 1 生产VIP');
    return;
  }

  const saved = apiKeyConfigService.setApiKeyNoteByIndex(index - 1, note);
  if (!saved) {
    await ctx.reply('无效序号，请先使用 /show_api_key 查看主 Key 列表。');
    return;
  }

  await ctx.reply(`✅ 已为第 ${index} 个 API Key 设置备注：${note}`);
}
