import { hdhiveClient } from '../clients/hdhive.client.js';
import type { UnlockResultView } from '../types/resource.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';

export const unlockService = {
  async unlock(slug: string): Promise<UnlockResultView> {
    if (!slug || slug === 'undefined' || slug === 'null') {
      logger.warn('UnlockService', `unlock blocked: empty/invalid slug=${String(slug)}`);
      return { status: 'error', message: '资源标识丢失，请返回列表重新点击解锁' };
    }
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
        const status = err.response?.status;
        const body = err.response?.data as { code?: string; message?: string; msg?: string } | undefined;
        const code = body?.code;
        const apiMsg = body?.message ?? body?.msg;
        logger.warn(
          'UnlockService',
          `unlock failed slug=${slug} httpStatus=${status ?? 'n/a'} code=${code ?? 'n/a'} msg=${apiMsg ?? err.message}`,
        );
        if (code === 'INSUFFICIENT_POINTS') {
          return { status: 'insufficient_points' };
        }
        // 把真实错误原因透出来，方便排查（带上 code/状态码）
        const parts: string[] = [];
        if (status) parts.push(`HTTP ${status}`);
        if (code) parts.push(code);
        if (apiMsg) parts.push(apiMsg);
        const message = parts.length ? parts.join(' · ') : (err.message || '服务暂时不可用，请稍后再试');
        return { status: 'error', message };
      }
      logger.warn('UnlockService', `unlock failed slug=${slug} non-axios`, err);
      const message = err instanceof Error && err.message ? err.message : '服务暂时不可用，请稍后再试';
      return { status: 'error', message };
    }
  },
};
