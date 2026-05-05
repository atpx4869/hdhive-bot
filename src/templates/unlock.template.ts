import { InlineKeyboard } from 'grammy';
import { cb } from '../utils/callback-data.js';
import type { UnlockResultView } from '../types/resource.js';

function buildBackKeyboard(sessionId: string, page: number) {
  return new InlineKeyboard().text('返回列表', cb.navBack(sessionId, page));
}

function buildResultKeyboard(sessionId: string, page: number, forwardBotUsername?: string | null) {
  const keyboard = new InlineKeyboard();
  if (forwardBotUsername) {
    keyboard.text('打开转存Bot', cb.forwardBotOpen(sessionId, page)).row();
  }
  keyboard.text('返回列表', cb.navBack(sessionId, page));
  return keyboard;
}

function buildForwardBotKeyboard(sessionId: string, page: number, forwardBotUsername: string) {
  return new InlineKeyboard()
    .url('继续打开转存Bot', `https://t.me/${forwardBotUsername.replace(/^@/, '')}`).row()
    .text('返回列表', cb.navBack(sessionId, page));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildCopyFriendlyLinkBlock(result: UnlockResultView): string[] {
  if (result.fullUrl) {
    return [`<code>${escapeHtml(result.fullUrl)}</code>`];
  }

  const lines: string[] = [];
  if (result.url) {
    lines.push(`<code>${escapeHtml(result.url)}</code>`);
  }
  if (result.accessCode) {
    lines.push(`提取码：<code>${escapeHtml(result.accessCode)}</code>`);
  }
  return lines;
}

export const unlockTemplate = {
  buildUnlockResultMessage(result: UnlockResultView, sessionId: string, page: number, forwardBotUsername?: string | null) {
    const keyboard = buildResultKeyboard(sessionId, page, forwardBotUsername);

    switch (result.status) {
      case 'already_owned':
        return {
          text: [
            '✅ 你已拥有该资源',
            '',
            forwardBotUsername ? '请复制下面的完整链接发送给转存Bot：' : '链接如下：',
            '',
            ...buildCopyFriendlyLinkBlock(result),
          ].filter(Boolean).join('\n'),
          keyboard,
        };

      case 'free':
        return {
          text: [
            '✅ 免费获取成功',
            '',
            forwardBotUsername ? '请复制下面的完整链接发送给转存Bot：' : '链接如下：',
            '',
            ...buildCopyFriendlyLinkBlock(result),
          ].filter(Boolean).join('\n'),
          keyboard,
        };

      case 'success':
        return {
          text: [
            '✅ 解锁成功',
            '',
            forwardBotUsername ? '请复制下面的完整链接发送给转存Bot：' : '链接如下：',
            '',
            ...buildCopyFriendlyLinkBlock(result),
          ].filter(Boolean).join('\n'),
          keyboard,
        };

      case 'insufficient_points':
        return {
          text: '⛔ 积分不足，无法解锁该资源。',
          keyboard,
        };

      default:
        return {
          text: `⛔ ${result.message ?? '解锁失败，请稍后再试'}`,
          keyboard,
        };
    }
  },

  buildPrivateChatOnlyMessage() {
    return { text: '请私聊机器人解锁资源。' };
  },

  buildForwardBotJumpMessage(sessionId: string, page: number, forwardBotUsername: string) {
    return {
      text: [
        '已通过权限校验。',
        '',
        '点击下面按钮打开转存Bot。',
      ].join('\n'),
      keyboard: buildForwardBotKeyboard(sessionId, page, forwardBotUsername),
    };
  },
};
