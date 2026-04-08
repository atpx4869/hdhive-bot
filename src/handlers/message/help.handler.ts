import type { Context } from 'grammy';
import { getTelegramUserId } from '../../utils/guards.js';
import { authService } from '../../services/auth.service.js';
import { helpTemplate } from '../../templates/help.template.js';
import { env } from '../../config/env.js';
import { errorTemplate } from '../../templates/error.template.js';

export async function helpHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;

  const identity = authService.resolveIdentity(telegramUserId);
  if (!identity) {
    await ctx.reply(errorTemplate.noPermission());
    return;
  }

  const { text, keyboard } = helpTemplate.buildHelpMessage(env.BOT_USERNAME);
  await ctx.reply(text, { reply_markup: keyboard });
}
