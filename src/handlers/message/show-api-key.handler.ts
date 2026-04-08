import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';

export async function showApiKeyHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const status = apiKeyConfigService.getMaskedStatus();
  const { text, keyboard } = adminTemplate.buildApiKeyStatusMessage(status);
  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
}
