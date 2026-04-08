import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { errorTemplate } from '../../templates/error.template.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { apiKeyInspectionService } from '../../services/api-key-inspection.service.js';

export async function showApiKeyHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;
  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  const merged = await apiKeyInspectionService.buildStatusWithLevels();
  const rendered = adminTemplate.buildApiKeyStatusMessage(merged);
  await ctx.reply(rendered.text, { parse_mode: 'HTML', reply_markup: rendered.keyboard });
}
