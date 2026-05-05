import type { Context } from 'grammy';
import { authService } from '../../services/auth.service.js';
import { accountService } from '../../services/account.service.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { logger } from '../../utils/logger.js';

function maskApiKey(key: string | null): string {
  if (!key) return '未配置';
  if (key.length <= 8) return `${key[0] ?? '*'}***${key[key.length - 1] ?? '*'}`;
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

export async function accountHandler(ctx: Context) {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) return;

  if (!authService.isAdmin(telegramUserId)) {
    await ctx.reply(errorTemplate.adminOnly());
    return;
  }

  logger.info('AccountHandler', `user=${telegramUserId}`);
  try {
    const snapshot = await accountService.getAccountProfile();
    const rotation = apiKeyConfigService.getRotationState();
    const activeKey = rotation.activeKey ?? rotation.primaryKeys[0] ?? null;
    const activeKeyIndex = activeKey ? Math.max(0, rotation.primaryKeys.indexOf(activeKey)) : 0;
    const activeKeyMasked = maskApiKey(activeKey);

    const { text, keyboard } = adminTemplate.buildAccountMessage({
      ...snapshot,
      activeKeyIndex,
      activeKeyMasked,
    });
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch (err) {
    logger.error('AccountHandler', `user=${telegramUserId}`, err);
    await ctx.reply(errorTemplate.generic());
  }
}
