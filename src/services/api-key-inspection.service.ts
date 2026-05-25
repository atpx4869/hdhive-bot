import axios from 'axios';
import { apiKeyConfigService } from './api-key-config.service.js';
import { hdhiveClient } from '../clients/hdhive.client.js';
import { logger } from '../utils/logger.js';
import { maskApiKey } from '../utils/format.js';

export type ApiKeyInspectionResult = {
  validStatus: '有效' | '待确认' | '无效';
  validEmoji: '✅' | '⚠️' | '❌';
  levelLabel: '高级账号' | '普通账号' | '等级未知' | '未知';
  levelEmoji: '👑' | '🙂' | '🛡️' | '❓';
};

export type ApiKeyOverallStatus = {
  label: '当前整体可用' | '仅部分 Key 可用' | '当前不可用';
  emoji: '✅' | '⚠️' | '❌';
};

let lastInspectionAt: string | null = null;

export const apiKeyInspectionService = {
  getLastInspectionAt(): string | null {
    return lastInspectionAt;
  },
  async detectLevels(keys: string[]): Promise<ApiKeyInspectionResult[]> {
    return Promise.all(keys.map(async (key) => {
      const masked = maskApiKey(key);
      try {
        const me = await hdhiveClient.getMeByApiKey(key);
        const isVip = !!me.data.is_vip;
        // 诊断：把 HDHive /me 实际返回的字段名打印出来，便于发现 vip 状态被放在
        // 非约定字段里（例如 vip_level / user_meta.is_vip 等）。
        const d = me.data as unknown as Record<string, unknown>;
        logger.info(
          'ApiKeyInspection',
          `key=${masked} status=200 is_vip=${isVip} level=${JSON.stringify(d.level)} is_forever_vip=${JSON.stringify(d.is_forever_vip)} weekly_free_quota=${JSON.stringify(d.weekly_free_quota)} weekly_free_quota_unlimited=${JSON.stringify(d.weekly_free_quota_unlimited)}`,
        );
        return {
          validStatus: '有效',
          validEmoji: '✅',
          levelLabel: isVip ? '高级账号' : '普通账号',
          levelEmoji: isVip ? '👑' : '🙂',
        } satisfies ApiKeyInspectionResult;
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status ?? null;
          const code = (err.response?.data as { code?: string } | undefined)?.code;
          const apiMsg = (err.response?.data as { message?: string; msg?: string } | undefined);
          const msg = apiMsg?.message ?? apiMsg?.msg ?? err.message;

          if (code === 'INVALID_API_KEY' || code === 'DISABLED_API_KEY' || code === 'EXPIRED_API_KEY') {
            logger.warn(
              'ApiKeyInspection',
              `key=${masked} status=${status ?? 'n/a'} code=${code} msg=${msg} → 无效`,
            );
            return {
              validStatus: '无效',
              validEmoji: '❌',
              levelLabel: '未知',
              levelEmoji: '❓',
            } satisfies ApiKeyInspectionResult;
          }

          // VIP_REQUIRED 可能是两种情况：
          //   1) 账号本身不是 Premium
          //   2) 这把 API Key 没勾选 vip scope（即使账号本身是 Premium）
          // 仅凭 /api/open/me 的 403 无法分辨，因此这里不再贴「普通账号」，
          // 改成「等级未知」并把真实状态写进日志，便于排查。
          if (status === 403 && code === 'VIP_REQUIRED') {
            logger.warn(
              'ApiKeyInspection',
              `key=${masked} status=403 code=VIP_REQUIRED → 等级未知（vip scope 未开通或账号非 Premium）`,
            );
            return {
              validStatus: '有效',
              validEmoji: '✅',
              levelLabel: '等级未知',
              levelEmoji: '🛡️',
            } satisfies ApiKeyInspectionResult;
          }

          logger.warn(
            'ApiKeyInspection',
            `key=${masked} status=${status ?? 'n/a'} code=${code ?? 'n/a'} msg=${msg} → 待确认`,
          );
        } else {
          logger.warn(
            'ApiKeyInspection',
            `key=${masked} non-axios err=${err instanceof Error ? err.message : String(err)} → 待确认`,
          );
        }
        return {
          validStatus: '待确认',
          validEmoji: '⚠️',
          levelLabel: '未知',
          levelEmoji: '❓',
        } satisfies ApiKeyInspectionResult;
      }
    }));
  },

  async buildStatusWithLevels() {
    const status = apiKeyConfigService.getMaskedStatus();
    const realKeys = apiKeyConfigService.getPrimaryApiKeys();
    const inspections = await this.detectLevels(realKeys);

    const hasValid = inspections.some(item => item.validStatus === '有效');
    const hasPending = inspections.some(item => item.validStatus === '待确认');

    const overall: ApiKeyOverallStatus = hasValid
      ? { label: '当前整体可用', emoji: '✅' }
      : hasPending
        ? { label: '仅部分 Key 可用', emoji: '⚠️' }
        : { label: '当前不可用', emoji: '❌' };

    lastInspectionAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    return {
      ...status,
      primaryKeyLevels: inspections.map(item => `${item.levelEmoji} ${item.levelLabel}`),
      primaryKeyValidity: inspections.map(item => `${item.validEmoji} ${item.validStatus}`),
      overallStatus: `${overall.emoji} ${overall.label}`,
      lastInspectionAt,
    };
  },
};
