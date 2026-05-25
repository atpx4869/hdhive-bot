import { InlineKeyboard } from 'grammy';
import { cb } from '../utils/callback-data.js';
import type { ResourceCard } from '../types/resource.js';
import { esc, italic, spoiler } from '../utils/html.js';
import { Icon, Divider, brandFooter, formatPanLabelDetail } from './icons.js';

export const detailTemplate = {
  buildResourceDetailMessage(
    card: ResourceCard,
    sessionId: string,
    page: number,
    isPrivate: boolean,
  ) {
    const isFree = card.unlockPoints === null || card.unlockPoints === 0;
    const priceText = isFree ? `${Icon.free} 免费` : `${Icon.unlock} ${card.unlockPoints} 积分`;

    const lines: string[] = [
      // 标题块
      `${Icon.movie} <b>${esc(card.title)}</b>`,
      `${formatPanLabelDetail(card.panType)} · ${italic(esc(card.originText))}`,
    ];

    if (card.lastValidatedAt) {
      lines.push(`${Icon.time} 最后验证 ${esc(card.lastValidatedAt)}`);
    }

    // 规格块
    lines.push(Divider);
    lines.push(`${Icon.size} 大小　${esc(card.shareSize)}`);
    lines.push(`${Icon.resolution} 分辨率　${esc(card.resolutionText)}`);
    lines.push(`${Icon.source} 片源　${esc(card.sourceText)}`);
    lines.push(`${Icon.subtitle} 字幕　${esc(card.subtitleText)}`);

    // 经济块
    lines.push(Divider);
    lines.push(`${priceText}`);
    lines.push(`${Icon.validation} 验证　${esc(card.validationText)}`);
    if (card.unlockedUsersCount !== null) {
      lines.push(`${Icon.users} 已解锁　${card.unlockedUsersCount}`);
    }

    if (card.remark) {
      lines.push(Divider);
      lines.push(`${Icon.remark} 备注`);
      lines.push(spoiler(card.remark));
    }

    const keyboard = new InlineKeyboard();
    if (isPrivate) {
      keyboard.text(`${Icon.brand} 立即解锁`, cb.unlock(card.slug, sessionId, page)).row();
    }
    keyboard.text(`${Icon.back} 返回列表`, cb.navBack(sessionId, page));

    return { text: lines.join('\n') + brandFooter(), keyboard };
  },
};
