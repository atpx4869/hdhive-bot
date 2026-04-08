import { tmdbClient } from '../clients/tmdb.client.js';
import type { InlineQueryResultArticle } from 'grammy/types';
import type { TmdbCandidate } from '../types/resource.js';
import { sessionService } from './session.service.js';
import { cb } from '../utils/callback-data.js';

export type InlineSearchResult = {
  results: InlineQueryResultArticle[];
  nextOffset: string;
};

const INLINE_PAGE_SIZE = 5;

function buildInlineNotice(id: string, title: string, description: string): InlineQueryResultArticle {
  return {
    type: 'article',
    id,
    title,
    description,
    input_message_content: {
      message_text: `${title}\n\n${description}`,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    },
  };
}

export const inlineService = {
  buildNoticeResult(kind: 'unauthorized' | 'short_query' | 'no_result' | 'error'): InlineSearchResult {
    switch (kind) {
      case 'unauthorized':
        return {
          results: [buildInlineNotice('unauthorized', '暂无权限使用', '你当前不在 Bot 白名单中，请联系管理员开通。')],
          nextOffset: '',
        };
      case 'short_query':
        return {
          results: [buildInlineNotice('short-query', '请输入至少 2 个字', '例如：斗破苍穹、仙逆、Fight Club')],
          nextOffset: '',
        };
      case 'no_result':
        return {
          results: [buildInlineNotice('no-result', '未找到相关资源', '请尝试更短关键词、别名、原名或英文名。')],
          nextOffset: '',
        };
      default:
        return {
          results: [buildInlineNotice('error', '搜索暂时不可用', '请稍后重试，或直接私聊机器人搜索。')],
          nextOffset: '',
        };
    }
  },

  async searchInline(query: string, offset: string | undefined, telegramUserId: string): Promise<InlineSearchResult> {
    const page = offset ? parseInt(offset, 10) || 1 : 1;

    const candidates = await tmdbClient.searchMulti(query);
    if (!candidates.length) {
      return this.buildNoticeResult('no_result');
    }

    const paginatedCandidates = candidates.slice((page - 1) * INLINE_PAGE_SIZE, page * INLINE_PAGE_SIZE);
    const sessionId = sessionService.createCandidateSession({
      telegramUserId,
      query,
      candidates: paginatedCandidates,
    });

    const results: InlineQueryResultArticle[] = paginatedCandidates.map((candidate, index) => ({
      type: 'article',
      id: `${candidate.mediaType}-${candidate.tmdbId}`,
      title: `${candidate.mediaType === 'movie' ? '🎬 电影' : '📺 剧集'}｜${candidate.title}${candidate.year ? ` (${candidate.year})` : ''}`,
      description: candidate.overview ? (candidate.overview.length > 60 ? `${candidate.overview.slice(0, 60)}...` : candidate.overview) : '点击按钮原地查看该影视的资源列表',
      input_message_content: {
        message_text: [
          `${candidate.mediaType === 'movie' ? '🎬 电影' : '📺 剧集'}：${candidate.title}${candidate.year ? ` (${candidate.year})` : ''}`,
          candidate.overview ? `简介：${candidate.overview}` : '点击按钮原地查看资源列表。',
          ``,
          `请点击下方按钮，原地查看资源列表。`,
        ].join('\n'),
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      },
      reply_markup: {
        inline_keyboard: [[{
          text: '查看资源',
          callback_data: cb.pick(sessionId, index),
        }]],
      },
    }));

    const totalPages = Math.ceil(candidates.length / INLINE_PAGE_SIZE);
    const nextOffset = page < totalPages
      ? String(page + 1)
      : '';

    return { results, nextOffset };
  },
};
