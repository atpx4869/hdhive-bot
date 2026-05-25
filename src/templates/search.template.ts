import { InlineKeyboard } from 'grammy';
import { cb } from '../utils/callback-data.js';
import type { TmdbCandidate, PagePresentation, ResourceCard } from '../types/resource.js';
import { esc, italic, spoiler, truncate } from '../utils/html.js';
import { Icon, Divider, brandFooter, formatPanLabel, paginationBar } from './icons.js';

function unlockBadgeForButton(card: ResourceCard): string {
  if (card.unlockPoints === null || card.unlockPoints === 0) return Icon.free;
  return `¥${card.unlockPoints}`;
}

export const searchTemplate = {
  buildSearchEntryMessage() {
    return {
      text: [
        `${Icon.search} <b>请直接发送要搜索的关键词</b>`,
        '',
        '示例：',
        '· Fight Club',
        '· 仙逆',
        '· 黑镜',
        '',
        `${italic('不确定怎么搜？发送 /help')}`,
      ].join('\n'),
    };
  },

  buildCandidatePickerMessage(sessionId: string, candidates: TmdbCandidate[]) {
    const keyboard = new InlineKeyboard();
    const lines: string[] = [
      `${Icon.search} <b>找到以下影视条目</b>`,
      `${italic('请选择对应的电影 / 剧集后查看资源')}`,
      Divider,
    ];

    candidates.forEach((c, i) => {
      const icon = c.mediaType === 'movie' ? Icon.movie : Icon.tv;
      const typeLabel = c.mediaType === 'movie' ? '电影' : '剧集';
      const yearPart = c.year ? ` (${c.year})` : '';
      const label = `${icon} ${typeLabel}｜${truncate(c.title, 32)}${yearPart}`;
      keyboard.text(label, cb.pick(sessionId, i)).row();

      lines.push('');
      lines.push(`<b>${i + 1}.</b> ${icon} ${typeLabel}｜${esc(c.title)}${esc(yearPart)}`);
      if (c.originalTitle && c.originalTitle !== c.title) {
        lines.push(`<i>原名：${esc(c.originalTitle)}</i>`);
      }
      if (c.overview) {
        lines.push(`<i>${esc(truncate(c.overview, 50))}</i>`);
      }
    });

    keyboard.text(`${Icon.refresh} 重新搜索`, cb.navSearch());

    return {
      text: lines.join('\n') + brandFooter(),
      keyboard,
    };
  },

  buildResultListMessage(
    sessionId: string,
    candidateSessionId: string,
    candidateTitle: string,
    candidateTypeLabel: string,
    presentation: PagePresentation,
    _isPrivate: boolean,
    _showAliSection = false,
  ) {
    const { shown115Items, aliItems, page, totalPages, total, pageSize, totalAliCount, viewMode } = presentation;
    const items = viewMode === 'aliyun' ? aliItems : shown115Items;
    const modeTitle = viewMode === 'aliyun' ? `${Icon.panAli} 阿里云盘资源` : `${Icon.pan115} 115 资源`;

    const lines: string[] = [
      `${Icon.movie} <b>${esc(candidateTitle)}</b>`,
      `${italic(`已选择：${candidateTypeLabel}`)}`,
      Divider,
      `${modeTitle} · 共 ${total} 条 · ${paginationBar(page, totalPages)}`,
    ];

    if (viewMode === '115' && !shown115Items.length && totalAliCount > 0) {
      lines.push('');
      lines.push(`${Icon.warn} 当前没有可展示的 115 资源；阿里云盘资源共 <b>${totalAliCount}</b> 条，可点下方按钮查看。`);
    }

    items.forEach((card, i) => {
      const num = (page - 1) * pageSize + i + 1;
      const isFree = card.unlockPoints === null || card.unlockPoints === 0;
      const priceBadge = isFree ? `${Icon.free} 免费` : `${Icon.unlock} ${card.unlockPoints} 积分`;
      lines.push('');
      // 第一行：序号 + 标题
      lines.push(`<b>${num}.</b> ${esc(card.title)}`);
      // 第二行：规格 · 网盘 · 价格（中点分隔，更轻）
      const metaParts = [
        `${Icon.size} ${esc(card.shareSize)}`,
        `${Icon.resolution} ${esc(card.resolutionText)}`,
        `${Icon.source} ${esc(card.sourceText)}`,
        formatPanLabel(card.panType),
        priceBadge,
      ];
      lines.push(metaParts.join(' · '));
      if (card.subtitleText && card.subtitleText !== '无字幕') {
        lines.push(`${Icon.subtitle} ${esc(card.subtitleText)}`);
      }
      if (card.remark) {
        // 长备注用 spoiler 折叠，避免主列表过长
        const short = truncate(card.remark, 60);
        lines.push(`${Icon.remark} ${spoiler(short)}`);
      }
    });

    if (viewMode === '115' && totalAliCount > 0) {
      lines.push('');
      lines.push(`${italic(`${Icon.panAli} 阿里云盘资源 ${totalAliCount} 条（默认隐藏）`)}`);
    }

    const keyboard = new InlineKeyboard();

    // 序号按钮：每个按钮文案带价签
    const ROW_SIZE = 5;
    let rowBtns: Array<{ text: string; data: string }> = [];

    items.forEach((card, i) => {
      const num = (page - 1) * pageSize + i + 1;
      const badge = unlockBadgeForButton(card);
      rowBtns.push({ text: `${num}·${badge}`, data: cb.unlock(card.slug, sessionId, page) });
      if (rowBtns.length === ROW_SIZE || i === items.length - 1) {
        rowBtns.forEach(b => keyboard.text(b.text, b.data));
        keyboard.row();
        rowBtns = [];
      }
    });

    // 分页按钮
    const navRow: Array<{ text: string; callback_data: string }> = [];
    if (page > 1) navRow.push({ text: '⬅️ 上一页', callback_data: cb.page(sessionId, page - 1) });
    if (page < totalPages) navRow.push({ text: '下一页 ➡️', callback_data: cb.page(sessionId, page + 1) });
    if (navRow.length) {
      navRow.forEach(b => keyboard.text(b.text, b.callback_data));
      keyboard.row();
    }

    if (viewMode === '115' && totalAliCount > 0) {
      keyboard.text(`${Icon.panAli} 查看阿里云盘（${totalAliCount}）`, cb.toggleAli(sessionId, 1)).row();
    }

    if (viewMode === 'aliyun') {
      keyboard.text(`${Icon.pan115} 返回 115 资源`, cb.toggle115(sessionId, 1)).row();
    }

    keyboard.text(`${Icon.back} 换一个条目`, cb.navCandidates(candidateSessionId));
    keyboard.text(`${Icon.refresh} 重新搜索`, cb.navSearch());

    return { text: lines.join('\n') + brandFooter(), keyboard };
  },
};
