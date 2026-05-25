import { InlineKeyboard } from 'grammy';
import { cb } from '../utils/callback-data.js';
import type { UnlockResultView } from '../types/resource.js';
import { code, esc, italic } from '../utils/html.js';
import { Icon, Divider, brandFooter } from './icons.js';

function buildResultKeyboard(sessionId: string, page: number, forwardBotUsername?: string | null) {
  const keyboard = new InlineKeyboard();
  if (forwardBotUsername) {
    keyboard.url(`${Icon.forward} 发往转存 Bot`, `https://t.me/${forwardBotUsername.replace(/^@/, '')}`).row();
  }
  keyboard.text(`${Icon.back} 返回列表`, cb.navBack(sessionId, page));
  return keyboard;
}

function buildCopyFriendlyLinkBlock(result: UnlockResultView): string[] {
  if (result.fullUrl) {
    return [code(result.fullUrl)];
  }

  const lines: string[] = [];
  if (result.url) {
    lines.push(code(result.url));
  }
  if (result.accessCode) {
    lines.push(`提取码：${code(result.accessCode)}`);
  }
  return lines;
}

function buildSuccessText(headline: string, result: UnlockResultView, forwardBotUsername?: string | null): string {
  const hint = forwardBotUsername
    ? '请复制下面的完整链接发给转存 Bot：'
    : '链接如下，点击即可复制：';
  return [
    headline,
    Divider,
    italic(hint),
    '',
    ...buildCopyFriendlyLinkBlock(result),
  ].filter(Boolean).join('\n') + brandFooter();
}

export const unlockTemplate = {
  buildUnlockResultMessage(result: UnlockResultView, sessionId: string, page: number, forwardBotUsername?: string | null) {
    const keyboard = buildResultKeyboard(sessionId, page, forwardBotUsername);

    switch (result.status) {
      case 'already_owned':
        return {
          text: buildSuccessText(`${Icon.ok} <b>你已拥有该资源</b>`, result, forwardBotUsername),
          keyboard,
        };

      case 'free':
        return {
          text: buildSuccessText(`${Icon.free} <b>免费获取成功</b>`, result, forwardBotUsername),
          keyboard,
        };

      case 'success':
        return {
          text: buildSuccessText(`${Icon.brand} <b>解锁成功</b>`, result, forwardBotUsername),
          keyboard,
        };

      case 'insufficient_points':
        return {
          text: [
            `${Icon.battery} <b>积分不足，无法解锁该资源</b>`,
            Divider,
            italic('可尝试：'),
            '· 选择免费资源',
            '· 等待每周免费额度刷新',
            '· 联系管理员充值',
          ].join('\n') + brandFooter(),
          keyboard,
        };

      default:
        return {
          text: [
            `${Icon.err} <b>解锁失败</b>`,
            Divider,
            esc(result.message ?? '服务暂时不可用，请稍后再试'),
            '',
            italic('你可以稍后重试，或返回列表换一个资源。'),
          ].join('\n') + brandFooter(),
          keyboard,
        };
    }
  },

  buildPrivateChatOnlyMessage() {
    return { text: `${Icon.warn} 请私聊机器人解锁资源。` };
  },
};
