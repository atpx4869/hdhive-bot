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
  // 默认按 HTML 解析；调用方可显式传 parse_mode 覆盖（包括传 undefined 关闭）
  const merged = options && 'parse_mode' in options
    ? options
    : { parse_mode: 'HTML' as const, ...(options ?? {}) };
  try {
    await ctx.editMessageText(text, merged);
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
  const merged = options && 'parse_mode' in options
    ? options
    : { parse_mode: 'HTML' as const, ...(options ?? {}) };
  try {
    await ctx.api.editMessageText(chatId, messageId, text, merged);
  } catch (err) {
    if (isMessageNotModifiedError(err)) {
      logger.debug('TelegramSafe', 'Ignored chat message is not modified');
      return;
    }
    throw err;
  }
}
