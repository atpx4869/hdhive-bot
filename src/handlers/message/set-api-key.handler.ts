import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
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
    await ctx.reply('参数错误。\n\n示例：\n/set_api_key key_a,key_b,key_c');
    return;
  }

  const saved = apiKeyConfigService.setPrimaryApiKeys(raw);
  if (!saved.length) {
    await ctx.reply('API Key 不能为空。\n\n示例：\n/set_api_key key_a,key_b,key_c');
    return;
  }

  await ctx.reply(`✅ HDHive API Key 已更新\n\n主 Key 数量：${saved.length}\n当前生效：${saved.length} 个顺序轮询\n已同步回写 .env 中的 DEFAULT_API_KEY（仅首个）`);
}
