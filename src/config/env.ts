import 'dotenv/config';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env: ${key}`);
  return val;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  TELEGRAM_BOT_TOKEN: requireEnv('TELEGRAM_BOT_TOKEN'),
  BOT_USERNAME: requireEnv('BOT_USERNAME'),
  DEFAULT_API_KEY: requireEnv('DEFAULT_API_KEY'),
  TMDB_API_KEY: requireEnv('TMDB_API_KEY'),
  BOT_ADMIN_IDS: (process.env.BOT_ADMIN_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean),
  DATABASE_PATH: process.env.DATABASE_PATH ?? './data/bot.db',
  OUTBOUND_PROXY_URL: process.env.OUTBOUND_PROXY_URL?.trim() || undefined,
  FORWARD_BOT_USERNAME: process.env.FORWARD_BOT_USERNAME?.trim() || undefined,
  PREFLIGHT_LEVEL: (process.env.PREFLIGHT_LEVEL?.trim().toLowerCase() === 'minimal') ? 'minimal' : 'full',
};
