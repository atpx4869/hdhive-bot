import './config/env.js';
import { createBot } from './bot/create-bot.js';
import { registerHandlers } from './bot/register-handlers.js';
import { logger } from './utils/logger.js';
import { preflightService } from './services/preflight.service.js';
import { telegramCommandsService } from './services/telegram-commands.service.js';

async function main() {
  await preflightService.run();

  const bot = createBot();
  registerHandlers(bot);

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
