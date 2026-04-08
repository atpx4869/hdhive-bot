import axios from 'axios';
import { apiKeyConfigService } from './api-key-config.service.js';
import { hdhiveClient } from '../clients/hdhive.client.js';

export type ApiKeyInspectionResult = {
  validStatus: '有效' | '待确认' | '无效';
  validEmoji: '✅' | '⚠️' | '❌';
  levelLabel: '高级账号' | '普通账号' | '未知';
  levelEmoji: '👑' | '🙂' | '❓';
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
    return {
      ...status,
      primaryKeyLevels: inspections.map(item => `${item.levelEmoji} ${item.levelLabel}`),
      primaryKeyValidity: inspections.map(item => `${item.validEmoji} ${item.validStatus}`),
    };
  },
};
