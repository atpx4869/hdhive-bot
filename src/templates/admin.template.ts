import { InlineKeyboard } from 'grammy';
import { cb } from '../utils/callback-data.js';
import type { AccountSnapshot, QuotaSnapshot } from '../types/account.js';
import type { BotUser } from '../types/bot.js';
import { esc, italic } from '../utils/html.js';
import { Icon, Divider, brandFooter } from './icons.js';

export type ApiKeyStatusView = {
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
  lastInspectionAt?: string | null;
};

export const adminTemplate = {
  buildMeMessage(snapshot: AccountSnapshot) {
    const keyboard = new InlineKeyboard()
      .text(`${Icon.refresh} 刷新`, cb.adminMe())
      .text(`${Icon.quota} 额度`, cb.adminQuota());

    const lines = [
      `${Icon.account} <b>账号概览</b>`,
      Divider,
      `昵称　${esc(snapshot.nickname)}`,
      `VIP 　${esc(snapshot.vipText)}`,
      `积分　<b>${snapshot.points}</b>`,
      `激活　${snapshot.isActivate ? `${Icon.ok} 已激活` : `${Icon.warn} 未激活`}`,
      `最后活跃　${esc(snapshot.lastActiveAt)}`,
      '',
      italic('更多详情请使用 /account'),
    ];

    return { text: lines.join('\n') + brandFooter(), keyboard };
  },

  buildAccountMessage(snapshot: AccountSnapshot) {
    const keyboard = new InlineKeyboard()
      .text(`${Icon.refresh} 刷新`, cb.adminMe())
      .text(`${Icon.quota} 额度`, cb.adminQuota());

    const lines = [
      `${Icon.account} <b>账号信息</b>`,
      Divider,
      `昵称　${esc(snapshot.nickname)}`,
      snapshot.username ? `用户名　${esc(snapshot.username)}` : '',
      snapshot.email ? `邮箱　${esc(snapshot.email)}` : '',
      `VIP 　${esc(snapshot.vipText)}`,
      `积分　<b>${snapshot.points}</b>`,
      `签到　${snapshot.signinDaysTotal} 天`,
      `分享　${snapshot.shareNum} 个`,
      `激活　${snapshot.isActivate ? `${Icon.ok} 已激活` : `${Icon.warn} 未激活`}`,
      `Telegram　${snapshot.telegramBound ? `${Icon.ok} 已绑定` : `${Icon.warn} 未绑定`}`,
      `最后活跃　${esc(snapshot.lastActiveAt)}`,
      Divider,
      `${Icon.apiKey} 当前来源：第 ${(snapshot.activeKeyIndex ?? 0) + 1} 把 API Key（${esc(snapshot.activeKeyMasked ?? '未配置')}）`,
    ].filter(Boolean);

    return { text: lines.join('\n') + brandFooter(), keyboard };
  },

  buildQuotaMessage(snapshot: QuotaSnapshot) {
    const keyboard = new InlineKeyboard()
      .text(`${Icon.refresh} 刷新`, cb.adminQuota())
      .text(`${Icon.account} 账号`, cb.adminMe());

    const hasEndpointQuota = snapshot.endpointRemaining !== null || snapshot.endpointLimit !== null;
    const remaining = snapshot.endpointRemaining === null ? '未知' : String(snapshot.endpointRemaining);
    const limit = snapshot.endpointLimit === null ? '未知' : String(snapshot.endpointLimit);
    const weeklyRemaining = snapshot.weeklyUnlimited ? '不限' : String(snapshot.weeklyRemaining);

    const lines = [
      `${Icon.quota} <b>额度信息</b>`,
      Divider,
      italic('API 接口额度'),
      hasEndpointQuota
        ? `今日剩余 <b>${remaining}</b> / ${limit}`
        : `${Icon.warn} 当前接口未返回额度上限/剩余字段`,
      '',
      italic('今日调用'),
      `总计 ${snapshot.todayTotalCalls} · ${Icon.ok} ${snapshot.todaySuccessCalls} · ${Icon.err} ${snapshot.todayFailedCalls}`,
      `平均延迟 ${snapshot.avgLatency.toFixed(0)} ms`,
      Divider,
      italic('永 V 免费额度'),
      `本周已用 ${snapshot.weeklyUsed}`,
      `本周剩余 <b>${weeklyRemaining}</b>`,
      `累积额度 ${snapshot.bonusQuota} / ${snapshot.bonusQuotaMax}`,
    ];

    return { text: lines.join('\n') + brandFooter(), keyboard };
  },

  buildUserAddResult(telegramUserId: string) {
    return {
      text: `${Icon.ok} <b>已添加白名单用户</b>\n\nTelegram ID：<code>${esc(telegramUserId)}</code>` + brandFooter(),
    };
  },

  buildUserAlreadyExists() {
    return { text: `${Icon.warn} 该用户已在白名单中。` };
  },

  buildUserDelResult(telegramUserId: string) {
    return {
      text: `${Icon.ok} <b>已移除白名单用户</b>\n\nTelegram ID：<code>${esc(telegramUserId)}</code>` + brandFooter(),
    };
  },

  buildUserNotFound() {
    return { text: `${Icon.warn} 未找到该白名单用户。` };
  },

  buildUserListMessage(users: BotUser[]) {
    const keyboard = new InlineKeyboard().text(`${Icon.refresh} 刷新`, cb.adminUsers());

    if (!users.length) {
      return { text: `${Icon.users2} 当前白名单为空。`, keyboard };
    }

    const lines = [`${Icon.users2} <b>白名单用户列表</b>`, Divider];
    users.forEach((u, i) => {
      const name = u.username ? `@${esc(u.username)}` : esc(u.firstName ?? '-');
      lines.push(`${i + 1}. <code>${esc(u.telegramUserId)}</code> · ${name}`);
    });

    return { text: lines.join('\n') + brandFooter(), keyboard };
  },

  /**
   * 第一层：API Key 总览。
   * 每把 key 一行，点击进入第二层（buildApiKeyItemMessage）做操作。
   */
  buildApiKeyStatusMessage(status: ApiKeyStatusView) {
    const keyboard = new InlineKeyboard()
      .text(`${Icon.refresh} 刷新`, cb.adminApiKey()).row();

    // 模式切换
    const autoLabel = status.mode === 'auto' ? `${Icon.ok} 自动故障转移` : '自动故障转移';
    const manualLabel = status.mode === 'manual' ? `${Icon.ok} 手动切换` : '手动切换';
    keyboard.text(autoLabel, cb.adminApiMode('auto')).text(manualLabel, cb.adminApiMode('manual')).row();

    // 每把 key 一个独立按钮进入第二层
    status.primaryKeys.forEach((key, index) => {
      const isActive = key === status.activeKey;
      const tag = isActive ? `${Icon.brand} ` : '';
      keyboard.text(`${tag}${index + 1}. ${key}`, cb.adminApiKeyItem(index + 1)).row();
    });

    keyboard.text(`${Icon.warn} 清空兜底`, cb.adminApiClearFallback());

    const primaryLines = status.primaryKeys.map((key, index) => {
      const isActive = key === status.activeKey;
      const note = status.primaryKeyNotes[index] ? ` · 备注 ${esc(status.primaryKeyNotes[index]!)}` : '';
      const validity = status.primaryKeyValidity[index] ? ` · ${esc(status.primaryKeyValidity[index]!)}` : '';
      const level = status.primaryKeyLevels[index] ? ` · ${esc(status.primaryKeyLevels[index]!)}` : '';
      return `${isActive ? `${Icon.brand} ` : '　'}${index + 1}. <code>${esc(key)}</code>${validity}${level}${note}`;
    });

    return {
      text: [
        `${Icon.apiKey} <b>HDHive API Key 状态</b>`,
        Divider,
        `${esc(status.overallStatus)}`,
        `模式　${status.mode === 'auto' ? `${Icon.refresh} 自动故障转移（首 Key 优先，失败自动切下一把/兜底）` : `${Icon.brand} 手动切换`}`,
        `当前 Active　<code>${esc(status.activeKey)}</code>`,
        `兜底 Key　<code>${esc(status.fallbackKey)}</code>`,
        status.lastInspectionAt ? `最后检测　${esc(status.lastInspectionAt)}` : '',
        Divider,
        `主 Key 数量　${status.primaryCount}`,
        ...primaryLines,
        Divider,
        `默认 .env　<code>${esc(status.persistedDefault)}</code>`,
        '',
        italic('点击下方按钮选中某把 Key 后可切换为 Active / 兜底 / 删除。'),
      ].filter(Boolean).join('\n') + brandFooter(),
      keyboard,
    };
  },

  /**
   * 第二层：单把 Key 的操作面板。
   */
  buildApiKeyItemMessage(status: ApiKeyStatusView, index: number) {
    const key = status.primaryKeys[index];
    if (!key) {
      return {
        text: `${Icon.warn} 该 Key 序号不存在，请返回总览。` + brandFooter(),
        keyboard: new InlineKeyboard().text(`${Icon.back} 返回总览`, cb.adminApiKey()),
      };
    }
    const isActive = key === status.activeKey;
    const note = status.primaryKeyNotes[index] ?? '';
    const validity = status.primaryKeyValidity[index] ?? '';
    const level = status.primaryKeyLevels[index] ?? '';

    const keyboard = new InlineKeyboard()
      .text(isActive ? `${Icon.ok} 当前 Active` : `${Icon.brand} 切为 Active`, cb.adminApiActive(index + 1))
      .text(`${Icon.warn} 设为兜底`, cb.adminApiSetFallback(index + 1)).row()
      .text(`${Icon.err} 删除该 Key`, cb.adminApiDelete(index + 1)).row()
      .text(`${Icon.back} 返回总览`, cb.adminApiKey());

    return {
      text: [
        `${Icon.apiKey} <b>第 ${index + 1} 把 API Key</b>`,
        Divider,
        `值　<code>${esc(key)}</code>`,
        validity ? `状态　${esc(validity)}` : '',
        level ? `等级　${esc(level)}` : '',
        note ? `备注　${esc(note)}` : `备注　${italic('未设置')}`,
        '',
        italic('删除后无法恢复；若它是 Active，删除后会自动切到下一把。'),
      ].filter(Boolean).join('\n') + brandFooter(),
      keyboard,
    };
  },

  /**
   * API Key 命令系列的统一回复模板（HTML + 品牌脚注），
   * 给 /set_api_key、/add_api_key、/del_api_key、/replace_api_key、
   * /set_active_api_key、/set_api_mode、/set_fallback_api_key、
   * /del_fallback_api_key、/set_api_key_note、/del_api_key_note 复用。
   */
  buildApiKeyReply(opts: {
    title: string;
    detailLines?: string[];
    status: 'ok' | 'warn' | 'err';
    hint?: string;
  }) {
    const icon = opts.status === 'ok' ? Icon.ok : opts.status === 'warn' ? Icon.warn : Icon.err;
    const lines = [
      `${icon} <b>${esc(opts.title)}</b>`,
      ...(opts.detailLines && opts.detailLines.length ? [Divider, ...opts.detailLines] : []),
      ...(opts.hint ? ['', italic(opts.hint)] : []),
    ];
    return { text: lines.join('\n') + brandFooter() };
  },

  /** API Key 命令系列的参数错误提示 */
  buildApiKeyBadParam(example: string) {
    return {
      text: [
        `${Icon.warn} <b>参数错误</b>`,
        Divider,
        '示例：',
        `<code>${esc(example)}</code>`,
      ].join('\n') + brandFooter(),
    };
  },
};
