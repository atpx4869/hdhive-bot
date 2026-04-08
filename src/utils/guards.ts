import type { Context } from 'grammy';

export function isPrivateChat(ctx: Context): boolean {
  return ctx.chat?.type === 'private';
}

export function isGroupChat(ctx: Context): boolean {
  return ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
}

export function getTelegramUserId(ctx: Context): string | null {
  return ctx.from?.id?.toString() ?? null;
}
