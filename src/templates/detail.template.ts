import { InlineKeyboard } from 'grammy';
import { cb } from '../utils/callback-data.js';
import type { ResourceCard } from '../types/resource.js';

function formatPanType(panType: string | null): string {
  if (!panType) return '未知网盘';
  const v = panType.toLowerCase();
  if (v === '115') return '💾 115网盘';
  if (v.includes('ali')) return '☁️ 阿里云盘';
  return panType;
}

export const detailTemplate = {
  buildResourceDetailMessage(
    card: ResourceCard,
    sessionId: string,
    page: number,
    isPrivate: boolean,
  ) {
    const lines = [
      `🎬 <b>${card.title}</b>`,
      '',
      `📦 大小：${card.shareSize}`,
      `💽 网盘：${formatPanType(card.panType)}`,
      `🎞 分辨率：${card.resolutionText}`,
      `📡 片源：${card.sourceText}`,
      `🈸 字幕：${card.subtitleText}`,
      `💰 解锁：${card.unlockText}`,
      `🔍 验证：${card.validationText}`,
      `🏷 来源：${card.originText}`,
    ];

    if (card.unlockedUsersCount !== null) {
      lines.push(`👥 已解锁：${card.unlockedUsersCount}`);
    }
    if (card.lastValidatedAt) {
      lines.push(`🕒 最后验证：${card.lastValidatedAt}`);
    }
    if (card.remark) {
      lines.push(`📝 备注：${card.remark}`);
    }

    const keyboard = new InlineKeyboard();
    if (isPrivate) {
      keyboard.text('立即解锁', cb.unlock(card.slug, sessionId, page)).row();
    }
    keyboard.text('返回列表', cb.navBack(sessionId, page));

    return { text: lines.join('\n'), keyboard };
  },
};
