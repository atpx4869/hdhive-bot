import { InlineKeyboard } from 'grammy';
import { cb } from '../utils/callback-data.js';

export const helpTemplate = {
  buildHelpMessage(botUsername: string, isAdmin = false) {
    const keyboard = new InlineKeyboard()
      .text('搜索示例', cb.helpExample())
      .text('开始搜索', cb.navSearch());

    const lines: string[] = [
      '📘 使用帮助',
      '',
      '1. 私聊或任意聊天中发送关键词',
      '2. 先选择影视条目（电影 / 剧集）',
      '3. 查看 115 资源列表',
      '4. 直接点击序号按钮解锁下载',
      '',
      '常用命令：',
      '/search 关键词',
      '/help',
      '',
      `也可以在任意聊天中输入：@${botUsername} 关键词`,
    ];

    if (isAdmin) {
      lines.push('');
      lines.push('管理员命令：');
      lines.push('/account  查看账号信息');
      lines.push('/user_add /user_del /user_list  管理白名单');
      lines.push('/show_api_key  管理 API Key');
    }

    return {
      text: lines.join('\n'),
      keyboard,
    };
  },

  buildSearchExampleMessage(botUsername: string) {
    const keyboard = new InlineKeyboard().text('开始搜索', cb.navSearch());
    return {
      text: [
        '搜索示例：',
        '',
        '/search Fight Club',
        '/search 星际穿越',
        '/search 黑镜',
        '',
        '也可以在任意聊天中输入：',
        `@${botUsername} Fight Club`,
      ].join('\n'),
      keyboard,
    };
  },

  buildUsageMessage(botUsername: string) {
    const keyboard = new InlineKeyboard().text('开始搜索', cb.navSearch());
    return {
      text: [
        '使用说明：',
        '',
        '1. 私聊机器人发送 /search 关键词 搜索资源',
        '2. 先确认是电影还是剧集',
        '3. 浏览 115 资源列表，直接点击序号按钮',
        '4. 解锁仅在私聊中有效',
        '',
        `也可使用 @${botUsername} 关键词 在任意聊天快速搜索。`,
      ].join('\n'),
      keyboard,
    };
  },
};
