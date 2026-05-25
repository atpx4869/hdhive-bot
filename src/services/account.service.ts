import { hdhiveClient } from '../clients/hdhive.client.js';
import type { AccountSnapshot } from '../types/account.js';
import { formatVipText, formatDate } from '../utils/format.js';

export type AccountProfile = Omit<AccountSnapshot, 'activeKeyIndex' | 'activeKeyMasked'>;

export const accountService = {
  async getAccountProfile(): Promise<AccountProfile> {
    const res = await hdhiveClient.getMe();
    const d = res.data;
    // HDHive 文档只保证 user_meta 存在但未列出子字段，做一层空值防御
    const meta = d.user_meta ?? ({} as Partial<typeof d.user_meta>);
    const base: AccountProfile = {
      nickname: d.nickname ?? '未知',
      isVip: !!d.is_vip,
      vipText: formatVipText(!!d.is_vip, d.vip_expiration_date),
      points: meta.points ?? 0,
      signinDaysTotal: meta.signin_days_total ?? 0,
      shareNum: meta.share_num ?? 0,
      isActivate: !!meta.is_activate,
      telegramBound: !!d.telegram_user,
      lastActiveAt: d.last_active_at ? formatDate(d.last_active_at) : '未知',
    };
    // exactOptionalPropertyTypes 下，可选字段不能显式赋 undefined；缺值时直接不写键。
    if (d.username) base.username = d.username;
    if (d.email) base.email = d.email;
    return base;
  },
};
