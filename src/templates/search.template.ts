import { InlineKeyboard } from 'grammy';
import { cb } from '../utils/callback-data.js';
import type { TmdbCandidate, ResourceCard, PaginatedResult, PagePresentation } from '../types/resource.js';

function formatPanType(panType: string | null): string {
  if (!panType) return '❓ 未知';
  const v = panType.toLowerCase();
  if (v === '115') return '💾 115';
  if (v.includes('ali')) return '☁️ 阿里云';
  return `📦 ${panType}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const searchTemplate = {
  buildSearchEntryMessage() {
    return { text: '请直接发送要搜索的关键词。\n\n示例：\nFight Club\n\n也支持：\n/search Fight Club\n\n不确定怎么搜？可发送 /help' };
  },

  buildCandidatePickerMessage(sessionId: string, candidates: TmdbCandidate[]) {
    const keyboard = new InlineKeyboard();
    const lines: string[] = ['找到以下影视条目，请先确认电影 / 剧集后再选择：'];

    candidates.forEach((c, i) => {
      const icon = c.mediaType === 'movie' ? '🎬' : '📺';
      const typeLabel = c.mediaType === 'movie' ? '电影' : '剧集';
      const label = `${icon} ${typeLabel}｜${c.title}${c.year ? ` (${c.year})` : ''}`;
      keyboard.text(label, cb.pick(sessionId, i)).row();

      lines.push('');
      lines.push(`${i + 1}. ${icon} ${typeLabel}｜${c.title}${c.year ? ` (${c.year})` : ''}`);
      if (c.originalTitle && c.originalTitle !== c.title) {
        lines.push(`原名：${c.originalTitle}`);
      }
      if (c.overview) {
        const short = c.overview.length > 40 ? `${c.overview.slice(0, 40)}...` : c.overview;
        lines.push(`简介：${short}`);
      }
    });

    keyboard.text('重新搜索', cb.navSearch());

    return {
      text: lines.join('\n'),
      keyboard,
    };
  },

  buildResultListMessage(
    sessionId: string,
    candidateSessionId: string,
    candidateTitle: string,
    candidateTypeLabel: string,
    presentation: PagePresentation,
    isPrivate: boolean,
    showAliSection = false,
  ) {
    const { shown115Items, aliItems, page, totalPages, total, pageSize, totalAliCount, viewMode } = presentation;
    const items = viewMode === 'aliyun' ? aliItems : shown115Items;
    const modeTitle = viewMode === 'aliyun' ? '☁️ 阿里云盘资源' : '💾 115资源';

    const lines: string[] = [
      `🎬 <b>${candidateTitle}</b>`,
      `已选择：${candidateTypeLabel}`,
      '',
      `${modeTitle} ${total} 条，第 ${page}/${totalPages} 页：`,
    ];

    if (viewMode === '115' && !shown115Items.length && totalAliCount > 0) {
      lines.push('');
      lines.push(`当前没有可展示的 115 资源，阿里云盘资源共 ${totalAliCount} 条。`);
    }

    items.forEach((card, i) => {
      const num = (page - 1) * pageSize + i + 1;
      lines.push('');
      lines.push(`<b>${num}.</b> ${card.title}`);
      lines.push(`💰 解锁：${escapeHtml(card.unlockText)}`);
      if (card.subtitleText && card.subtitleText !== '无字幕') {
        lines.push(`🈸 字幕：${escapeHtml(card.subtitleText)}`);
      }
      lines.push(`📦 ${card.shareSize} | ${card.resolutionText} | ${card.sourceText} | ${formatPanType(card.panType)}`);
      if (card.remark) {
        lines.push(`<blockquote>💬 描述：${escapeHtml(card.remark)}</blockquote>`);
      }
    });

    if (viewMode === '115' && totalAliCount > 0) {
      lines.push('');
      lines.push(`☁️ 阿里云盘资源 ${totalAliCount} 条（默认隐藏）`);
    }

    const keyboard = new InlineKeyboard();

    // 每行最多 5 个序号按钮
    const ROW_SIZE = 5;
    let rowBtns: Array<{ text: string; data: string }> = [];

    items.forEach((card, i) => {
      const num = (page - 1) * pageSize + i + 1;
      rowBtns.push({ text: String(num), data: cb.unlock(card.slug, sessionId, page) });
      if (rowBtns.length === ROW_SIZE || i === items.length - 1) {
        rowBtns.forEach(b => keyboard.text(b.text, b.data));
        keyboard.row();
        rowBtns = [];
      }
    });

    // 分页按钮
    const navRow: Array<{ text: string; callback_data: string }> = [];
    if (page > 1) navRow.push({ text: '⬅️ 上一页', callback_data: cb.page(sessionId, page - 1) });
    if (page < totalPages) navRow.push({ text: '➡️ 下一页', callback_data: cb.page(sessionId, page + 1) });
    if (navRow.length) {
      navRow.forEach(b => keyboard.text(b.text, b.callback_data));
      keyboard.row();
    }

    if (viewMode === '115' && totalAliCount > 0) {
      keyboard.text(`查看阿里云盘资源（${totalAliCount}）`, cb.toggleAli(sessionId, 1)).row();
    }

    if (viewMode === 'aliyun') {
      keyboard.text('返回115资源', cb.toggle115(sessionId, 1)).row();
    }

    keyboard.text('重新选条目', cb.navCandidates(candidateSessionId)).row();
    keyboard.text('重新搜索', cb.navSearch());

    return { text: lines.join('\n'), keyboard };
  },
};
