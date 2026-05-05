import { InlineKeyboard } from 'grammy';
import { cb } from '../utils/callback-data.js';

export const startTemplate = {
  buildGuestMessage() {
    return {
      text: '你暂无权限使用此机器人。\n如需开通，请联系管理员。',
      keyboard: undefined,
    };
  },

  buildUserMessage(botUsername: string) {
    const keyboard = new InlineKeyboard()
      .text('搜索示例', cb.helpExample())
      .text('使用说明', cb.helpUsage()).row()
      .text('开始搜索', cb.navSearch());
    return {
      text: [
        '欢迎使用资源搜索机器人。',
        '',
        '直接发送关键词即可搜索',
        '/search 关键词',
        '/help',
        '',
        `也可在任意聊天中使用：@${botUsername} 关键词`,
      ].join('\n'),
      keyboard,
    };
  },

  buildAdminMessage() {
    const keyboard = new InlineKeyboard()
      .text('搜索', cb.navSearch()).text('账号', cb.adminMe()).row()
      .text('用户列表', cb.adminUsers()).text('API Key', cb.adminApiKey()).row()
      .text('帮助', cb.helpUsage());
    return {
      text: [
        '欢迎使用资源搜索机器人（管理员模式）。',
        '',
        '直接发送关键词即可搜索',
        '/search 关键词',
        '/help',
        '/me',
        '/account',
        '/quota',
        '/show_api_key',
        '/set_api_key <key1,key2,...>',
        '/set_fallback_api_key <key>',
        '/user_add &lt;telegram_user_id&gt;',
        '/user_del &lt;telegram_user_id&gt;',
        '/user_list',
      ].join('\n'),
      keyboard,
    };
  },
};
