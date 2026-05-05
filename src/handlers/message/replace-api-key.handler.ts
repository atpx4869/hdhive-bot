import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
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
    await ctx.reply('参数错误。\n\n示例：\n/replace_api_key 1 新key内容');
    return;
  }

  const result = apiKeyConfigService.replacePrimaryKeyByIndex(index - 1, newKey);
  if (!result) {
    await ctx.reply('替换失败：序号不存在或新 Key 无效。');
    return;
  }

  await ctx.reply(`✅ 已替换第 ${index} 个主 Key`);
}
