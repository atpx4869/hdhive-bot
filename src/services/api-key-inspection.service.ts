import axios from 'axios';
import { apiKeyConfigService } from './api-key-config.service.js';
import { hdhiveClient } from '../clients/hdhive.client.js';

export const apiKeyInspectionService = {
  async detectLevels(keys: string[]): Promise<string[]> {
    return Promise.all(keys.map(async (key) => {
      try {
        const me = await hdhiveClient.getMeByApiKey(key);
        return me.data.is_vip ? '高级账号' : '普通账号';
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status ?? null;
          const code = err.response?.data?.code as string | undefined;

          // 只有明确命中 VIP_REQUIRED，才保守认为是普通账号。
          if (status === 403 && code === 'VIP_REQUIRED') {
            return '普通账号';
          }
        }
        return '未知';
      }
    }));
  },

  async buildStatusWithLevels() {
    const status = apiKeyConfigService.getMaskedStatus();
    const realKeys = apiKeyConfigService.getPrimaryApiKeys();
    const levels = await this.detectLevels(realKeys);
    return {
      ...status,
      primaryKeyLevels: levels,
    };
  },
};
