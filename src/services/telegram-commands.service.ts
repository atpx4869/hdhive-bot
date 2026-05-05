import type { Bot, Context } from 'grammy';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

type TelegramCommand = {
  command: string;
  description: string;
};

const defaultCommands: TelegramCommand[] = [
  { command: 'start', description: '显示欢迎页' },
  { command: 'help', description: '查看帮助与示例' },
  { command: 'search', description: '搜索资源' },
  { command: 'ping', description: '健康检查' },
];

const adminCommands: TelegramCommand[] = [
  { command: 'me', description: '查看账号状态' },
  { command: 'quota', description: '查看额度信息' },
  { command: 'account', description: '查看账号信息' },
  { command: 'user_add', description: '添加白名单用户' },
  { command: 'user_del', description: '删除白名单用户' },
  { command: 'user_list', description: '查看白名单用户' },
  { command: 'set_forward_bot', description: '设置转存Bot用户名' },
  { command: 'show_forward_bot', description: '查看当前转存Bot' },
  { command: 'show_api_key', description: '查看API Key状态' },
  { command: 'add_api_key', description: '添加一个主API Key' },
  { command: 'del_api_key', description: '删除一个主API Key' },
  { command: 'replace_api_key', description: '替换一个主API Key' },
  { command: 'set_api_key_note', description: '设置API Key备注' },
  { command: 'del_api_key_note', description: '删除API Key备注' },
  { command: 'set_fallback_api_key', description: '设置兜底API Key' },
  { command: 'del_fallback_api_key', description: '清空兜底API Key' },
  { command: 'set_api_mode', description: '设置API Key策略模式' },
  { command: 'set_active_api_key', description: '切换当前Active Key' },
];

export const telegramCommandsService = {
  async register(bot: Bot<Context>): Promise<void> {
    logger.info('TelegramCommands', 'Registering default bot commands');
    await bot.api.setMyCommands(defaultCommands);

    if (env.BOT_ADMIN_IDS.length > 0) {
      logger.info('TelegramCommands', 'Registering admin bot commands for configured admin users');
      for (const adminId of env.BOT_ADMIN_IDS) {
        await bot.api.setMyCommands([...defaultCommands, ...adminCommands], {
          scope: {
            type: 'chat',
            chat_id: Number(adminId),
          },
        });
      }
    }
  },
};
