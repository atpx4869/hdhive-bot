import { InlineKeyboard } from 'grammy';
import { cb } from '../utils/callback-data.js';
import { italic } from '../utils/html.js';
import { Icon, Divider, brandFooter } from './icons.js';

export const helpTemplate = {
  buildHelpMessage(botUsername: string, isAdmin = false) {
    const keyboard = new InlineKeyboard()
      .text(`${Icon.search} 搜索示例`, cb.helpExample())
      .text(`${Icon.brand} 开始搜索`, cb.navSearch());

    const lines: string[] = [
      `${Icon.help} <b>使用帮助</b>`,
      Divider,
      `1. 私聊或任意聊天中发送关键词`,
      `2. 选择影视条目（电影 / 剧集）`,
      `3. 查看 115 资源列表`,
      `4. 点击「序号·价签」按钮直接解锁`,
      '',
      italic('常用命令'),
      '· /search 关键词',
      '· /help',
      '',
      italic(`也可在任意聊天输入：@${botUsername} 关键词`),
    ];

    if (isAdmin) {
      lines.push(Divider);
      lines.push(italic('管理员命令'));
      lines.push('· /account · /quota · /me');
      lines.push('· /user_add · /user_del · /user_list');
      lines.push('· /show_api_key  管理 API Key');
    }

    return {
      text: lines.join('\n') + brandFooter(),
      keyboard,
    };
  },

  buildSearchExampleMessage(botUsername: string) {
    const keyboard = new InlineKeyboard().text(`${Icon.brand} 开始搜索`, cb.navSearch());
    return {
      text: [
        `${Icon.search} <b>搜索示例</b>`,
        Divider,
        '· /search Fight Club',
        '· /search 星际穿越',
        '· /search 黑镜',
        '',
        italic(`也可在任意聊天输入：@${botUsername} Fight Club`),
      ].join('\n') + brandFooter(),
      keyboard,
    };
  },

  buildUsageMessage(botUsername: string) {
    const keyboard = new InlineKeyboard().text(`${Icon.brand} 开始搜索`, cb.navSearch());
    return {
      text: [
        `${Icon.help} <b>使用说明</b>`,
        Divider,
        '1. 私聊机器人，发送 /search 关键词 搜索资源',
        '2. 先确认是电影还是剧集',
        '3. 浏览 115 资源列表，点击按钮直接解锁',
        '4. 解锁仅在私聊中有效',
        '',
        italic(`也可使用 @${botUsername} 关键词 在任意聊天快速搜索`),
      ].join('\n') + brandFooter(),
      keyboard,
    };
  },
};
