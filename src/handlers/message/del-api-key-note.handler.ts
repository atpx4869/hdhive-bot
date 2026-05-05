import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';

export async function delApiKeyNoteHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const text = ctx.message?.text ?? '';
  const raw = text.replace(/^\/del_api_key_note\s*/i, '').trim();
  const index = Number(raw);

  if (!Number.isInteger(index) || index < 1) {
    await ctx.reply('参数错误。\n\n示例：\n/del_api_key_note 1');
    return;
  }

  const result = apiKeyConfigService.deleteApiKeyNoteByIndex(index - 1);
  if (!result) {
    await ctx.reply('无效序号，请先使用 /show_api_key 查看主 Key 列表。');
    return;
  }

  await ctx.reply(`✅ 已删除第 ${index} 个 API Key 的备注`);
}
