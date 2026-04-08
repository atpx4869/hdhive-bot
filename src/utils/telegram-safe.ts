import type { Context } from 'grammy';
import { logger } from './logger.js';

function isMessageNotModifiedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes('message is not modified');
}

export async function safeEditMessageText(
  ctx: Context,
  text: string,
  options?: Parameters<Context['editMessageText']>[1],
): Promise<void> {
  try {
    await ctx.editMessageText(text, options);
  } catch (err) {
    if (isMessageNotModifiedError(err)) {
      logger.debug('TelegramSafe', 'Ignored message is not modified');
      return;
    }
    throw err;
  }
}

export async function safeEditChatMessageText(
  ctx: Context,
  chatId: number | string,
  messageId: number,
  text: string,
  options?: Parameters<Context['api']['editMessageText']>[3],
): Promise<void> {
  try {
    await ctx.api.editMessageText(chatId, messageId, text, options);
  } catch (err) {
    if (isMessageNotModifiedError(err)) {
      logger.debug('TelegramSafe', 'Ignored chat message is not modified');
      return;
    }
    throw err;
  }
}
