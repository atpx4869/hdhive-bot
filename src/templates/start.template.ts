import { InlineKeyboard } from 'grammy';
import { cb } from '../utils/callback-data.js';
import { esc, italic } from '../utils/html.js';
import { Icon, Divider, brandFooter } from './icons.js';

export type AdminHeroSummary = {
  nickname: string;
  vipText: string;
  points: number;
  endpointRemaining: number | null;
  endpointLimit: number | null;
  weeklyRemaining: number | string;
  activeKeyMasked: string;
};

export const startTemplate = {
  buildGuestMessage() {
    return {
      text: [
        `${Icon.warn} <b>你暂无权限使用此机器人</b>`,
        '',
        '如需开通，请联系管理员。',
      ].join('\n') + brandFooter(),
      keyboard: undefined,
    };
  },

  buildUserMessage(botUsername: string, displayName?: string) {
    const keyboard = new InlineKeyboard()
      .text(`${Icon.search} 开始搜索`, cb.navSearch())
      .text(`${Icon.help} 使用帮助`, cb.helpUsage()).row();

    const greeting = displayName
      ? `${Icon.brand} 欢迎，<b>${esc(displayName)}</b>`
      : `${Icon.brand} <b>欢迎使用资源搜索机器人</b>`;

    return {
      text: [
        greeting,
        '',
        '直接发送关键词即可搜索，例如：',
        '· 仙逆',
        '· Fight Club',
        Divider,
        italic('常用命令'),
        '· /search 关键词',
        '· /help',
        '',
        italic(`也可在任意聊天输入：@${botUsername} 关键词`),
      ].join('\n') + brandFooter(),
      keyboard,
    };
  },

  buildAdminMessage(hero?: AdminHeroSummary) {
    const keyboard = new InlineKeyboard()
      .text(`${Icon.search} 搜索`, cb.navSearch())
      .text(`${Icon.account} 账号`, cb.adminMe()).row()
      .text(`${Icon.users2} 用户列表`, cb.adminUsers())
      .text(`${Icon.apiKey} API Key`, cb.adminApiKey()).row()
      .text(`${Icon.quota} 额度`, cb.adminQuota())
      .text(`${Icon.help} 帮助`, cb.helpUsage()).row()
      .text(`${Icon.refresh} 刷新摘要`, cb.adminDashboard());

    const heroLines: string[] = [];
    if (hero) {
      const endpointPart = hero.endpointRemaining !== null && hero.endpointLimit !== null
        ? `今日剩余 <b>${hero.endpointRemaining}</b> / ${hero.endpointLimit}`
        : '今日额度：未知';
      const weeklyPart = `本周免费剩余 <b>${hero.weeklyRemaining}</b>`;
      heroLines.push(
        `${Icon.brand} 欢迎，<b>${esc(hero.nickname)}</b>　<i>${esc(hero.vipText)}</i>`,
        `${Icon.quota} ${endpointPart} · ${weeklyPart}`,
        `${Icon.unlock} 积分 <b>${hero.points}</b> · ${Icon.apiKey} ${esc(hero.activeKeyMasked)}`,
        Divider,
      );
    } else {
      heroLines.push(
        `${Icon.brand} <b>欢迎使用资源搜索机器人</b>　${italic('（管理员模式）')}`,
        Divider,
      );
    }

    return {
      text: [
        ...heroLines,
        '直接发送关键词即可搜索，例如：仙逆 / Fight Club',
        '',
        italic('管理员常用'),
        '· /search 关键词',
        '· /account · /quota',
        '· /user_add · /user_del · /user_list',
        '· /show_api_key',
        '',
        italic('更多说明：/help'),
      ].join('\n') + brandFooter(),
      keyboard,
    };
  },
};
