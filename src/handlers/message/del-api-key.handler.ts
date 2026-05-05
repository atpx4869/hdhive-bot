import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
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
    await ctx.reply('参数错误。\n\n示例：\n/del_api_key 1');
    return;
  }

  const result = apiKeyConfigService.deletePrimaryKeyByIndex(index - 1);
  if (!result) {
    await ctx.reply('删除失败：序号不存在，或至少保留 1 把主 Key。');
    return;
  }

  await ctx.reply(`✅ 已删除第 ${index} 个主 Key\n当前剩余主 Key 数量：${result.remainingCount}`);
}
