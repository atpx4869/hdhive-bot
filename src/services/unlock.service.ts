import { hdhiveClient } from '../clients/hdhive.client.js';
import type { UnlockResultView } from '../types/resource.js';
import axios from 'axios';

export const unlockService = {
  async unlock(slug: string): Promise<UnlockResultView> {
    try {
      const res = await hdhiveClient.unlockResource(slug);
      const d = res.data;
      const url = d.full_url ?? d.url;
      const accessCode = d.access_code ?? undefined;
      const fullUrl = d.full_url ?? undefined;

      if (d.already_owned) {
        return { status: 'already_owned', url, accessCode, fullUrl };
      }
      return { status: 'success', url, accessCode, fullUrl };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const code = err.response?.data?.code as string | undefined;
        if (code === 'INSUFFICIENT_POINTS') {
          return { status: 'insufficient_points' };
        }
      }
      return { status: 'error', message: '服务暂时不可用，请稍后再试' };
    }
  },
};
