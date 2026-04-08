import { Bot } from 'grammy';
import { env } from '../config/env.js';
import { getProxyAgent } from '../utils/proxy.js';

export function createBot() {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN, {
    client: {
      timeoutSeconds: 60,
      baseFetchConfig: {
        agent: getProxyAgent(),
      },
    },
  });
  return bot;
}
