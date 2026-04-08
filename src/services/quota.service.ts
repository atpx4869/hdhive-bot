import { hdhiveClient } from '../clients/hdhive.client.js';
import type { QuotaSnapshot } from '../types/account.js';

export const quotaService = {
  async getQuotaSnapshot(): Promise<QuotaSnapshot> {
    const [quotaRes, todayRes, weeklyRes] = await Promise.all([
      hdhiveClient.getQuota(),
      hdhiveClient.getUsageToday(),
      hdhiveClient.getWeeklyFreeQuota(),
    ]);

    const q = quotaRes.data;
    const t = todayRes.data;
    const w = weeklyRes.data;

    return {
      endpointLimit: q.endpoint_limit ?? null,
      endpointRemaining: q.endpoint_remaining ?? null,
      dailyReset: q.daily_reset,
      todayTotalCalls: t.total_calls,
      todaySuccessCalls: t.success_calls,
      todayFailedCalls: t.failed_calls,
      avgLatency: t.avg_latency,
      isForeverVip: w.is_forever_vip,
      weeklyUsed: w.used,
      weeklyRemaining: w.remaining,
      weeklyUnlimited: w.unlimited,
      bonusQuota: w.bonus_quota,
      bonusQuotaMax: w.bonus_quota_max,
    };
  },
};
