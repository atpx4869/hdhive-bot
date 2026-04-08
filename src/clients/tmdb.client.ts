import axios, { type AxiosInstance } from 'axios';
import { env } from '../config/env.js';
import type { TmdbCandidate } from '../types/resource.js';
import { getProxyAgent } from '../utils/proxy.js';

type TmdbMultiSearchResult = {
  results: Array<{
    id: number;
    media_type: 'movie' | 'tv' | 'person';
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    release_date?: string;
    first_air_date?: string;
    popularity?: number;
    overview?: string;
  }>;
};

class TmdbClient {
  private http: AxiosInstance;

  constructor() {
    const proxyAgent = getProxyAgent();
    this.http = axios.create({
      baseURL: 'https://api.themoviedb.org/3',
      timeout: 10000,
      httpAgent: proxyAgent,
      httpsAgent: proxyAgent,
      proxy: false,
      params: {
        api_key: env.TMDB_API_KEY,
        language: 'zh-CN',
      },
    });
  }

  async searchMulti(query: string): Promise<TmdbCandidate[]> {
    const res = await this.http.get<TmdbMultiSearchResult>('/search/multi', {
      params: { query },
    });

    return res.data.results
      .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, 8)
      .map(r => {
        const mediaType = r.media_type as 'movie' | 'tv';
        const title = (mediaType === 'movie' ? r.title : r.name) ?? '未知标题';
        const originalTitle = mediaType === 'movie' ? r.original_title : r.original_name;
        const date = mediaType === 'movie' ? r.release_date : r.first_air_date;
        const year = date ? date.slice(0, 4) : undefined;
        return {
          tmdbId: String(r.id),
          mediaType,
          title,
          originalTitle,
          year,
          overview: r.overview?.trim() || undefined,
        };
      });
  }
}

export const tmdbClient = new TmdbClient();
