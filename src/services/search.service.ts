import { tmdbClient } from '../clients/tmdb.client.js';
import { hdhiveClient } from '../clients/hdhive.client.js';
import type { TmdbCandidate, ResourceCard, PaginatedResult, PagePresentation } from '../types/resource.js';
import {
  formatResolution,
  formatShareSize,
  formatSource,
  formatSubtitle,
  formatUnlockText,
  formatValidationText,
  formatOriginText,
  formatDate,
} from '../utils/format.js';

export const PAGE_SIZE = 10;

function toResourceCard(r: Awaited<ReturnType<typeof hdhiveClient.getResourcesByTmdb>>[number]): ResourceCard {
  return {
    slug: r.slug,
    title: r.title,
    shareSize: formatShareSize(r.share_size),
    resolutionText: formatResolution(r.video_resolution ?? []),
    sourceText: formatSource(r.source ?? []),
    subtitleText: formatSubtitle(r.subtitle_language ?? [], r.subtitle_type ?? []),
    unlockText: formatUnlockText(r.is_unlocked, r.unlock_points ?? null),
    validationText: formatValidationText(r.validate_status),
    originText: formatOriginText(r.is_official),
    isUnlocked: r.is_unlocked,
    unlockPoints: r.unlock_points ?? null,
    lastValidatedAt: r.last_validated_at ? formatDate(r.last_validated_at) : null,
    unlockedUsersCount: r.unlocked_users_count ?? null,
    remark: r.remark ?? null,
    isInvalid: r.validate_status === 'invalid',
    panType: r.pan_type ?? null,
  };
}

function normalizePanType(panType: string | null | undefined): '115' | 'aliyun' | 'other' | null {
  if (!panType) return null;
  const v = panType.toLowerCase();
  if (v === '115') return '115';
  if (v.includes('ali')) return 'aliyun';
  return 'other';
}

export const searchService = {
  async searchCandidates(query: string): Promise<TmdbCandidate[]> {
    return tmdbClient.searchMulti(query);
  },

  async searchResourcesByCandidate(candidate: TmdbCandidate): Promise<ResourceCard[]> {
    const raw = await hdhiveClient.getResourcesByTmdb(candidate.mediaType, candidate.tmdbId);
    // 只过滤明确失效的资源（validate_status === 'invalid'）
    // null/error/checking 均保留，让用户自行判断
    const filtered = raw.filter(r => r.validate_status !== 'invalid');
    const freeItems: typeof filtered = [];
    const paidItems: typeof filtered = [];

    for (const item of filtered) {
      const isFree = item.unlock_points === null || item.unlock_points === 0;
      if (isFree) freeItems.push(item);
      else paidItems.push(item);
    }

    return [...freeItems, ...paidItems].map(toResourceCard);
  },

  async enrichPagePanTypes(items: ResourceCard[]): Promise<ResourceCard[]> {
    const enriched = await Promise.all(items.map(async (item) => {
      try {
        const detail = await Promise.race([
          hdhiveClient.getShareDetail(item.slug),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('pan_type fetch timeout')), 5000),
          ),
        ]);
        return {
          ...item,
          panType: detail.data.pan_type,
        } satisfies ResourceCard;
      } catch {
        return item;
      }
    }));
    return enriched;
  },

  async enrichAllPanTypes(items: ResourceCard[]): Promise<ResourceCard[]> {
    const BATCH_SIZE = 8;
    const result: ResourceCard[] = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const enrichedBatch = await this.enrichPagePanTypes(batch);
      result.push(...enrichedBatch);
    }

    return result;
  },

  async enrichRangePanTypes(items: ResourceCard[], startIndex: number, count: number): Promise<ResourceCard[]> {
    const start = Math.max(0, startIndex);
    const end = Math.min(items.length, start + count);
    if (start >= end) return items;

    const slice = items.slice(start, end);
    const enrichedSlice = await this.enrichPagePanTypes(slice);
    const cloned = [...items];
    cloned.splice(start, enrichedSlice.length, ...enrichedSlice);
    return cloned;
  },

  count115(items: ResourceCard[]): number {
    let count = 0;
    for (const item of items) {
      if (normalizePanType(item.panType) === '115') count += 1;
    }
    return count;
  },

  async ensurePanTypesForPage(items: ResourceCard[], page: number, pageSize: number = PAGE_SIZE): Promise<{ items: ResourceCard[]; ready: boolean; enrichedUntil: number }> {
    const target115Count = page * pageSize;
    let currentItems = items;
    let enrichedUntil = 0;

    // 已补查项：以 panType !== null 作为近似标识；无法知道未知网盘与未补查的绝对差异，
    // 这里通过从头连续扫描的方式保守推进。
    while (enrichedUntil < currentItems.length && currentItems[enrichedUntil]?.panType !== null) {
      enrichedUntil += 1;
    }

    let visible115 = this.count115(currentItems);
    if (visible115 >= target115Count || enrichedUntil >= currentItems.length) {
      return { items: currentItems, ready: enrichedUntil >= currentItems.length, enrichedUntil };
    }

    const BATCH_SIZE = 12;
    while (enrichedUntil < currentItems.length) {
      currentItems = await this.enrichRangePanTypes(currentItems, enrichedUntil, BATCH_SIZE);
      enrichedUntil = Math.min(currentItems.length, enrichedUntil + BATCH_SIZE);
      visible115 = this.count115(currentItems);
      if (visible115 >= target115Count) break;
    }

    return {
      items: currentItems,
      ready: enrichedUntil >= currentItems.length,
      enrichedUntil,
    };
  },

  classifyPage(items: ResourceCard[]): { shown115Items: ResourceCard[]; aliItems: ResourceCard[] } {
    const shown115Items: ResourceCard[] = [];
    const aliItems: ResourceCard[] = [];

    for (const item of items) {
      const pan = normalizePanType(item.panType);
      if (pan === '115') {
        shown115Items.push(item);
      } else if (pan === 'aliyun') {
        aliItems.push(item);
      }
    }

    return { shown115Items, aliItems };
  },

  async buildPagePresentation(items: ResourceCard[], page: number, pageSize: number = PAGE_SIZE, viewMode: '115' | 'aliyun' = '115'): Promise<PagePresentation> {
    const { shown115Items, aliItems } = this.classifyPage(items);
    const sourceItems = viewMode === 'aliyun' ? aliItems : shown115Items;
    const paginatedItems = this.paginateResources(sourceItems, page, pageSize);
    return {
      pageItems: paginatedItems.items,
      page: paginatedItems.page,
      totalPages: paginatedItems.totalPages,
      total: sourceItems.length,
      pageSize: paginatedItems.pageSize,
      shown115Items: viewMode === '115' ? paginatedItems.items : shown115Items,
      aliItems: viewMode === 'aliyun' ? paginatedItems.items : aliItems,
      totalAliCount: aliItems.length,
      viewMode,
    };
  },

  paginateResources(items: ResourceCard[], page: number, pageSize: number = PAGE_SIZE): PaginatedResult<ResourceCard> {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      page: safePage,
      totalPages,
      total: items.length,
      pageSize,
    };
  },
};
