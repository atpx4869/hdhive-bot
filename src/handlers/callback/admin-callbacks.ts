import type { Context } from 'grammy';
import { accountService } from '../../services/account.service.js';
import { quotaService } from '../../services/quota.service.js';
import { botUserService } from '../../services/bot-user.service.js';
import { apiKeyInspectionService } from '../../services/api-key-inspection.service.js';
import { apiKeyConfigService } from '../../services/api-key-config.service.js';
import { adminTemplate } from '../../templates/admin.template.js';
import { errorTemplate } from '../../templates/error.template.js';
import { logger } from '../../utils/logger.js';
import { safeEditMessageText } from '../../utils/telegram-safe.js';
import type { ParsedCallback } from '../../types/callback.js';

type AdminParsed = Extract<ParsedCallback, {
  type:
    | 'admin_me'
    | 'admin_quota'
    | 'admin_users'
    | 'admin_api_key'
    | 'admin_api_mode'
    | 'admin_api_active'
    | 'admin_api_delete'
    | 'admin_api_set_fallback'
    | 'admin_api_clear_fallback';
}>;

export async function handleAdminCallbacks(
  ctx: Context,
  telegramUserId: string,
  parsed: AdminParsed,
): Promise<boolean> {
  if (parsed.type === 'admin_me') {
    try {
      const snapshot = await accountService.getAccountProfile();
      const { text, keyboard } = adminTemplate.buildMeMessage(snapshot);
      await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (err) {
      logger.error('AdminCallbacks', `admin_me error`, err);
      await ctx.reply(errorTemplate.generic());
    }
    return true;
  }

  if (parsed.type === 'admin_quota') {
    try {
      const snapshot = await quotaService.getQuotaSnapshot();
      const { text, keyboard } = adminTemplate.buildQuotaMessage(snapshot);
      await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (err) {
      logger.error('AdminCallbacks', `admin_quota error`, err);
      await ctx.reply(errorTemplate.generic());
    }
    return true;
  }

  if (parsed.type === 'admin_users') {
    const users = botUserService.listUsers();
    const { text, keyboard } = adminTemplate.buildUserListMessage(users);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return true;
  }

  if (parsed.type === 'admin_api_key') {
    const status = await apiKeyInspectionService.buildStatusWithLevels();
    const { text, keyboard } = adminTemplate.buildApiKeyStatusMessage(status);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    return true;
  }

  if (parsed.type === 'admin_api_mode') {
    apiKeyConfigService.setMode(parsed.mode);
    const status = await apiKeyInspectionService.buildStatusWithLevels();
    const { text, keyboard } = adminTemplate.buildApiKeyStatusMessage(status);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    await ctx.answerCallbackQuery({ text: `已切换为${parsed.mode === 'auto' ? '自动轮转' : '手动切换'}` });
    return true;
  }

  if (parsed.type === 'admin_api_active') {
    const selected = apiKeyConfigService.setActiveKeyByIndex(parsed.index - 1);
    if (!selected) {
      await ctx.answerCallbackQuery({ text: '无效序号', show_alert: true });
      return true;
    }
    const status = await apiKeyInspectionService.buildStatusWithLevels();
    const { text, keyboard } = adminTemplate.buildApiKeyStatusMessage(status);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    await ctx.answerCallbackQuery({ text: `已切换到第 ${parsed.index} 个 Active Key` });
    return true;
  }

  if (parsed.type === 'admin_api_delete') {
    const deleted = apiKeyConfigService.deletePrimaryKeyByIndex(parsed.index - 1);
    if (!deleted) {
      await ctx.answerCallbackQuery({ text: '删除失败：序号不存在或至少保留 1 把主 Key', show_alert: true });
      return true;
    }
    const status = await apiKeyInspectionService.buildStatusWithLevels();
    const { text, keyboard } = adminTemplate.buildApiKeyStatusMessage(status);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    await ctx.answerCallbackQuery({ text: `已删除第 ${parsed.index} 个主 Key，剩余 ${deleted.remainingCount} 个` });
    return true;
  }

  if (parsed.type === 'admin_api_set_fallback') {
    const selected = apiKeyConfigService.setFallbackApiKeyByIndex(parsed.index - 1);
    if (!selected) {
      await ctx.answerCallbackQuery({ text: '无效序号', show_alert: true });
      return true;
    }
    const status = await apiKeyInspectionService.buildStatusWithLevels();
    const { text, keyboard } = adminTemplate.buildApiKeyStatusMessage(status);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    await ctx.answerCallbackQuery({ text: `已将第 ${parsed.index} 个主 Key 设为兜底` });
    return true;
  }

  if (parsed.type === 'admin_api_clear_fallback') {
    apiKeyConfigService.clearFallbackApiKey();
    const status = await apiKeyInspectionService.buildStatusWithLevels();
    const { text, keyboard } = adminTemplate.buildApiKeyStatusMessage(status);
    await safeEditMessageText(ctx, text, { parse_mode: 'HTML', reply_markup: keyboard });
    await ctx.answerCallbackQuery({ text: '已清空兜底 Key' });
    return true;
  }

  return false;
}
