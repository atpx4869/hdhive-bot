import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { getProxyAgent, getProxyUrl } from '../utils/proxy.js';
import { createBot } from '../bot/create-bot.js';

async function probe(
  name: string,
  url: string,
  timeout = 8000,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  const proxyAgent = getProxyAgent();
  const startedAt = Date.now();

  try {
    const res = await axios.get(url, {
      timeout,
      params,
      httpAgent: proxyAgent,
      httpsAgent: proxyAgent,
      proxy: false,
      validateStatus: () => true,
    });
    logger.info('Preflight', `${name} ok status=${res.status} cost=${Date.now() - startedAt}ms`);
  } catch (err) {
    logger.error('Preflight', `${name} failed url=${url}`, err);
    throw new Error(`${name} connectivity check failed`);
  }
}

export const preflightService = {
  async run(): Promise<void> {
    logger.info('Preflight', `Starting checks. proxy=${getProxyUrl() ?? 'disabled'}`);

    await probe('Telegram', `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`);
    await probe('TMDB', 'https://api.themoviedb.org/3/configuration', 8000, {
      api_key: env.TMDB_API_KEY,
    });
    await probe('HDHive', 'https://hdhive.com');

    const bot = createBot();
    const me = await bot.api.getMe();
    logger.info('Preflight', `grammY getMe ok username=@${me.username} id=${me.id}`);

    logger.info('Preflight', 'All connectivity checks passed');
  },
};
