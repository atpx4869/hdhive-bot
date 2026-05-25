import type { Context } from 'grammy';
import axios from 'axios';
import { authService } from '../../services/auth.service.js';
import { accountService } from '../../services/account.service.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { errorTemplate } from '../../templates/error.template.js';
import { getTelegramUserId } from '../../utils/guards.js';
import { logger } from '../../utils/logger.js';
import { maskApiKey } from '../../utils/format.js';

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
    const rawIndex = activeKey ? rotation.primaryKeys.indexOf(activeKey) : -1;
    // 如果 activeKey 已不在主列表里（被删但状态未清理），不要假装它是「第 1 把」
    const activeKeyIndex = rawIndex >= 0 ? rawIndex : 0;
    if (activeKey && rawIndex < 0) {
      logger.warn(
        'AccountHandler',
        `active key 不在主列表中，已回退展示首把（active=${maskApiKey(activeKey)}）`,
      );
    }
    const activeKeyMasked = rawIndex >= 0
      ? maskApiKey(activeKey)
      : `${maskApiKey(rotation.primaryKeys[0] ?? null)}（active 已失效，已回退）`;

    const { text, keyboard } = adminTemplate.buildAccountMessage({
      ...snapshot,
      activeKeyIndex,
      activeKeyMasked,
    });
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch (err) {
    // 把 HDHive 的真实错误透出来，方便管理员排查；不再吞成「服务暂时不可用」
    let detail = err instanceof Error ? err.message : String(err);
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const body = err.response?.data as { code?: string; message?: string; msg?: string } | undefined;
      const parts: string[] = [];
      if (status) parts.push(`HTTP ${status}`);
      if (body?.code) parts.push(body.code);
      const apiMsg = body?.message ?? body?.msg;
      if (apiMsg) parts.push(apiMsg);
      if (parts.length) detail = parts.join(' · ');
    }
    logger.error('AccountHandler', `user=${telegramUserId} detail=${detail}`, err);
    await ctx.reply(`❌ 拉取账号信息失败\n${detail}`);
  }
}
