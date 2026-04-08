import { HttpsProxyAgent } from 'https-proxy-agent';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let cachedAgent: HttpsProxyAgent<string> | null = null;

export function getProxyUrl(): string | undefined {
  return env.OUTBOUND_PROXY_URL;
}

export function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) return undefined;

  if (!cachedAgent) {
    cachedAgent = new HttpsProxyAgent(proxyUrl);
    logger.info('Proxy', `Using outbound proxy: ${proxyUrl}`);
  }

  return cachedAgent;
}
