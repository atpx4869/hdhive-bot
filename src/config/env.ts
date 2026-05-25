import 'dotenv/config';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env: ${key}`);
  return val;
}

/**
 * 解析 BOT_ADMIN_IDS：
 * - 拆分并去空
 * - 校验纯数字（Telegram user_id 是数字）
 * - 非数字条目过滤掉并打印警告，避免一个手误把整个 admin 列表悄悄失效
 * - 全空时打印警告（仍允许启动，让用户能用 /start 看到友好提示而非崩溃）
 */
function parseAdminIds(raw: string | undefined): string[] {
  const parts = (raw ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    if (/^\d+$/.test(p)) {
      valid.push(p);
    } else {
      invalid.push(p);
    }
  }
  if (invalid.length) {
    // 这里不能 import logger（循环依赖风险），直接 console.warn
    console.warn(`[env] BOT_ADMIN_IDS 含有非数字条目，已忽略：${invalid.join(', ')}`);
  }
  if (!valid.length) {
    console.warn('[env] BOT_ADMIN_IDS 为空：没有任何管理员，/user_add 等管理命令将无人能调用');
  }
  return valid;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  TELEGRAM_BOT_TOKEN: requireEnv('TELEGRAM_BOT_TOKEN'),
  BOT_USERNAME: requireEnv('BOT_USERNAME'),
  DEFAULT_API_KEY: requireEnv('DEFAULT_API_KEY'),
  TMDB_API_KEY: requireEnv('TMDB_API_KEY'),
  BOT_ADMIN_IDS: parseAdminIds(process.env.BOT_ADMIN_IDS),
  DATABASE_PATH: process.env.DATABASE_PATH ?? './data/bot.db',
  OUTBOUND_PROXY_URL: process.env.OUTBOUND_PROXY_URL?.trim() || undefined,
  FORWARD_BOT_USERNAME: process.env.FORWARD_BOT_USERNAME?.trim() || undefined,
  PREFLIGHT_LEVEL: (process.env.PREFLIGHT_LEVEL?.trim().toLowerCase() === 'minimal') ? 'minimal' : 'full',
};
