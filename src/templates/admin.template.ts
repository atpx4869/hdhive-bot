import { InlineKeyboard } from 'grammy';
import { cb } from '../utils/callback-data.js';
import type { AccountSnapshot, QuotaSnapshot } from '../types/account.js';
import type { BotUser } from '../types/bot.js';

type ApiKeyStatusView = {
  primaryKeys: string[];
  primaryKeyNotes: string[];
  primaryKeyLevels: string[];
  primaryKeyValidity: string[];
  overallStatus: string;
  fallbackKey: string;
  primaryCount: number;
  persistedDefault: string;
  mode: 'auto' | 'manual';
  activeKey: string;
};

export const adminTemplate = {
  buildMeMessage(snapshot: AccountSnapshot) {
    const keyboard = new InlineKeyboard().text('查看账号详情', cb.adminMe());

    const lines = [
      '👤 <b>账号概览</b>',
      '',
      `昵称：${snapshot.nickname}`,
      `VIP：${snapshot.vipText}`,
      `积分：${snapshot.points}`,
      `激活：${snapshot.isActivate ? '已激活' : '未激活'}`,
      `最后活跃：${snapshot.lastActiveAt}`,
      '',
      '更多详情请使用 /account',
    ].filter(Boolean);

    return { text: lines.join('\n'), keyboard };
  },

  buildAccountMessage(snapshot: AccountSnapshot) {
    const keyboard = new InlineKeyboard().text('刷新账号', cb.adminMe());

    const lines = [
      '👤 <b>账号信息</b>',
      '',
      `昵称：${snapshot.nickname}`,
      snapshot.username ? `用户名：${snapshot.username}` : '',
      snapshot.email ? `邮箱：${snapshot.email}` : '',
      `VIP：${snapshot.vipText}`,
      `积分：${snapshot.points}`,
      `签到：${snapshot.signinDaysTotal} 天`,
      `分享：${snapshot.shareNum} 个`,
      `激活：${snapshot.isActivate ? '已激活' : '未激活'}`,
      `Telegram：${snapshot.telegramBound ? '已绑定' : '未绑定'}`,
      `最后活跃：${snapshot.lastActiveAt}`,
      '',
      `当前来源：第 ${(snapshot.activeKeyIndex ?? 0) + 1} 把 API Key（${snapshot.activeKeyMasked ?? '未配置'}）`,
    ].filter(Boolean);

    return { text: lines.join('\n'), keyboard };
  },

  buildQuotaMessage(snapshot: QuotaSnapshot) {
    const keyboard = new InlineKeyboard()
      .text('刷新额度', cb.adminQuota()).text('查看账号', cb.adminMe());

    const hasEndpointQuota = snapshot.endpointRemaining !== null || snapshot.endpointLimit !== null;
    const remaining = snapshot.endpointRemaining === null ? '未知' : String(snapshot.endpointRemaining);
    const limit = snapshot.endpointLimit === null ? '未知' : String(snapshot.endpointLimit);
    const weeklyRemaining = snapshot.weeklyUnlimited ? '不限' : String(snapshot.weeklyRemaining);

    const lines = [
      '📊 <b>额度信息</b>',
      '',
      'API额度：',
      hasEndpointQuota ? `今日剩余：${remaining} / ${limit}` : '当前接口未返回额度上限/剩余字段',
      '',
      '今日调用：',
      `总计：${snapshot.todayTotalCalls}  成功：${snapshot.todaySuccessCalls}  失败：${snapshot.todayFailedCalls}`,
      `平均延迟：${snapshot.avgLatency.toFixed(0)}ms`,
      '',
      '永V免费额度：',
      `本周已用：${snapshot.weeklyUsed}`,
      `本周剩余：${weeklyRemaining}`,
      `累积额度：${snapshot.bonusQuota} / ${snapshot.bonusQuotaMax}`,
    ];

    return { text: lines.join('\n'), keyboard };
  },

  buildUserAddResult(telegramUserId: string) {
    return {
      text: `✅ 已添加白名单用户\n\nTelegram ID：${telegramUserId}`,
    };
  },

  buildUserAlreadyExists() {
    return { text: '该用户已在白名单中。' };
  },

  buildUserDelResult(telegramUserId: string) {
    return {
      text: `✅ 已移除白名单用户\n\nTelegram ID：${telegramUserId}`,
    };
  },

  buildUserNotFound() {
    return { text: '未找到该白名单用户。' };
  },

  buildUserListMessage(users: BotUser[]) {
    const keyboard = new InlineKeyboard().text('刷新列表', cb.adminUsers());

    if (!users.length) {
      return { text: '当前白名单为空。', keyboard };
    }

    const lines = ['👥 <b>白名单用户列表</b>', ''];
    users.forEach((u, i) => {
      const name = u.username ? `@${u.username}` : u.firstName ?? '-';
      lines.push(`${i + 1}. ${u.telegramUserId} | ${name}`);
    });

    return { text: lines.join('\n'), keyboard };
  },

  buildApiKeyStatusMessage(status: ApiKeyStatusView) {
    const keyboard = new InlineKeyboard()
      .text('刷新', cb.adminApiKey()).row()
      .text('自动', cb.adminApiMode('auto'))
      .text('手动', cb.adminApiMode('manual')).row();

    const primaryLines = status.primaryKeys.map((key, index) => {
      const isActive = key === status.activeKey;
      const note = status.primaryKeyNotes[index] ? `｜备注：${status.primaryKeyNotes[index]}` : '';
      const validity = status.primaryKeyValidity[index] ? `｜${status.primaryKeyValidity[index]}` : '';
      const level = status.primaryKeyLevels[index] ? `｜等级：${status.primaryKeyLevels[index]}` : '';
      return `${isActive ? '👉 ' : ''}${index + 1}. ${key}${validity}${level}${note}`;
    });

    status.primaryKeys.forEach((key, index) => {
      const isActive = key === status.activeKey;
      const activeSuffix = isActive ? '（当前）' : '';
      keyboard.text(`使用${index + 1}${activeSuffix}`, cb.adminApiActive(index + 1));
      keyboard.text(`备用${index + 1}`, cb.adminApiSetFallback(index + 1));
      keyboard.text(`删除${index + 1}`, cb.adminApiDelete(index + 1));
      if ((index + 1) % 3 === 0 || index === status.primaryKeys.length - 1) {
        keyboard.row();
      }
    });

    keyboard.text('清备', cb.adminApiClearFallback()).row();

    return {
      text: [
        '🔐 <b>HDHive API Key 状态</b>',
        '',
        `${status.overallStatus}`,
        `模式：${status.mode === 'auto' ? '自动轮转' : '手动切换'}`,
        `主 Key 数量：${status.primaryCount}`,
        ...primaryLines,
        '',
        `当前 Active Key：${status.activeKey}`,
        `兜底 Key：${status.fallbackKey}`,
        `默认 .env：${status.persistedDefault}`,
        '',
        '常用命令：',
        '/show_api_key',
        '/add_api_key 新key',
        '/del_api_key 1',
        '/replace_api_key 1 新key',
        '/set_api_key_note 1 备注',
      ].join('\n'),
      keyboard,
    };
  },
};
