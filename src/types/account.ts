export type AccountSnapshot = {
  nickname: string;
  username?: string;
  email?: string;
  isVip: boolean;
  vipText: string;
  points: number;
  signinDaysTotal: number;
  shareNum: number;
  isActivate: boolean;
  telegramBound: boolean;
  lastActiveAt: string;
  activeKeyIndex?: number;
  activeKeyMasked?: string;
};

export type QuotaSnapshot = {
  endpointLimit: number | null;
  endpointRemaining: number | null;
  dailyReset: number;
  todayTotalCalls: number;
  todaySuccessCalls: number;
  todayFailedCalls: number;
  avgLatency: number;
  isForeverVip: boolean;
  weeklyUsed: number;
  weeklyRemaining: number;
  weeklyUnlimited: boolean;
  bonusQuota: number;
  bonusQuotaMax: number;
};
