import axios from 'axios';
import { apiKeyConfigService } from './api-key-config.service.js';
import { hdhiveClient } from '../clients/hdhive.client.js';

export type ApiKeyInspectionResult = {
  validStatus: '有效' | '待确认' | '无效';
  validEmoji: '✅' | '⚠️' | '❌';
  levelLabel: '高级账号' | '普通账号' | '未知';
  levelEmoji: '👑' | '🙂' | '❓';
};

export type ApiKeyOverallStatus = {
  label: '当前整体可用' | '仅部分 Key 可用' | '当前不可用';
  emoji: '✅' | '⚠️' | '❌';
};

export const apiKeyInspectionService = {
  async detectLevels(keys: string[]): Promise<ApiKeyInspectionResult[]> {
    return Promise.all(keys.map(async (key) => {
      try {
        const me = await hdhiveClient.getMeByApiKey(key);
        return {
          validStatus: '有效',
          validEmoji: '✅',
          levelLabel: me.data.is_vip ? '高级账号' : '普通账号',
          levelEmoji: me.data.is_vip ? '👑' : '🙂',
        } satisfies ApiKeyInspectionResult;
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status ?? null;
          const code = err.response?.data?.code as string | undefined;

          if (code === 'INVALID_API_KEY' || code === 'DISABLED_API_KEY' || code === 'EXPIRED_API_KEY') {
            return {
              validStatus: '无效',
              validEmoji: '❌',
              levelLabel: '未知',
              levelEmoji: '❓',
            } satisfies ApiKeyInspectionResult;
          }

          // 只有明确命中 VIP_REQUIRED，才保守认为是普通账号。
          if (status === 403 && code === 'VIP_REQUIRED') {
            return {
              validStatus: '有效',
              validEmoji: '✅',
              levelLabel: '普通账号',
              levelEmoji: '🙂',
            } satisfies ApiKeyInspectionResult;
          }
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

    return {
      ...status,
      primaryKeyLevels: inspections.map(item => `${item.levelEmoji} ${item.levelLabel}`),
      primaryKeyValidity: inspections.map(item => `${item.validEmoji} ${item.validStatus}`),
      overallStatus: `${overall.emoji} ${overall.label}`,
    };
  },
};
