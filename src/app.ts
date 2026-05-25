import './config/env.js';
import { createBot } from './bot/create-bot.js';
import { registerHandlers } from './bot/register-handlers.js';
import { logger } from './utils/logger.js';
import { preflightService } from './services/preflight.service.js';
import { telegramCommandsService } from './services/telegram-commands.service.js';
import { closeDb } from './repositories/bot-user.repository.js';

async function main() {
  await preflightService.run();

  const bot = createBot();
  registerHandlers(bot);

  // 优雅关闭：先停 grammY 长轮询，再关 sqlite，避免在写入中途被强杀。
  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('App', `Received ${signal}, shutting down gracefully...`);
    try {
      await bot.stop();
      logger.info('App', 'Bot stopped');
    } catch (err) {
      logger.warn('App', 'bot.stop failed', err);
    }
    try {
      closeDb();
      logger.info('App', 'SQLite closed');
    } catch (err) {
      logger.warn('App', 'closeDb failed', err);
    }
    process.exit(0);
  }
  process.on('SIGINT', () => { void shutdown('SIGINT'); });
  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });

  logger.info('App', 'Calling grammY getMe...');
  const me = await bot.api.getMe();
  logger.info('App', `grammY getMe ok: @${me.username} (id: ${me.id})`);

  logger.info('App', 'Clearing webhook (safe no-op when empty)...');
  await bot.api.deleteWebhook({ drop_pending_updates: false });
  logger.info('App', 'Webhook cleared');

  logger.info('App', 'Initializing bot...');
  await bot.init();
  logger.info('App', 'Bot init done');

  await telegramCommandsService.register(bot);
  logger.info('App', 'Bot commands registered');

  logger.info('App', 'Starting long polling...');

  await bot.start({
    allowed_updates: ['message', 'callback_query', 'inline_query'],
    onStart(info) {
      logger.info('App', `Bot started: @${info.username} (id: ${info.id})`);
    },
  });
}

main().catch((err) => {
  logger.error('App', 'Startup failed', err);
  process.exit(1);
});

// 未捕获异常兜底，防止进程崩溃
process.on('uncaughtException', (err) => {
  logger.error('Process', 'UncaughtException', err);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Process', 'UnhandledRejection', reason);
});
