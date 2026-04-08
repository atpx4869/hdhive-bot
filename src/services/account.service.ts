import { hdhiveClient } from '../clients/hdhive.client.js';
import type { AccountSnapshot } from '../types/account.js';
import { formatVipText, formatDate } from '../utils/format.js';

export const accountService = {
  async getAccountSnapshot(): Promise<AccountSnapshot> {
    const res = await hdhiveClient.getMe();
    const d = res.data;
    return {
      nickname: d.nickname,
      username: d.username,
      isVip: d.is_vip,
      vipText: formatVipText(d.is_vip, d.vip_expiration_date),
      points: d.user_meta.points,
      signinDaysTotal: d.user_meta.signin_days_total,
      shareNum: d.user_meta.share_num,
      isActivate: d.user_meta.is_activate,
      telegramBound: !!d.telegram_user,
      lastActiveAt: d.last_active_at ? formatDate(d.last_active_at) : '未知',
    };
  },
};
