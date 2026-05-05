import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
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
    await ctx.reply('参数错误。\n\n示例：\n/add_api_key abcd1234efgh5678');
    return;
  }

  const result = apiKeyConfigService.addPrimaryKey(raw);
  if (!result) {
    await ctx.reply('API Key 不能为空或已存在。');
    return;
  }

  await ctx.reply(`✅ 已添加主 Key\n\n当前主 Key 数量：${result.totalCount}\n已回写 .env DEFAULT_API_KEY（仅首个）`);
}
