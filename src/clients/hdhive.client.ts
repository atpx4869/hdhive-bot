import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { getProxyAgent } from '../utils/proxy.js';
import { apiKeyConfigService } from '../services/api-key-config.service.js';

export type HDHiveMeResponse = {
  success: boolean;
  data: {
    id: number;
    nickname: string;
    username: string;
    email: string;
    avatar_url: string;
    is_vip: boolean;
    vip_expiration_date: string;
    last_active_at: string;
    user_meta: {
      points: number;
      signin_days_total: number;
      share_num: number;
      is_activate: boolean;
      notification_method: string;
    };
    telegram_user: {
      telegram_user_id: string;
      first_name: string;
      last_name: string;
    } | null;
    created_at: string;
  };
};

export type HDHiveQuotaResponse = {
  success: boolean;
  data: {
    daily_reset: number;
    endpoint_limit?: number | null;
    endpoint_remaining?: number | null;
  };
};

export type HDHiveUsageTodayResponse = {
  success: boolean;
  data: {
    total_calls: number;
    success_calls: number;
    failed_calls: number;
    avg_latency: number;
  };
};

export type HDHiveWeeklyFreeQuotaResponse = {
  success: boolean;
  data: {
    is_forever_vip: boolean;
    limit: number;
    used: number;
    remaining: number;
    unlimited: boolean;
    bonus_quota: number;
    bonus_quota_max: number;
  };
};

export type HDHiveResource = {
  slug: string;
  title: string;
  share_size: string;
  video_resolution: string[];
  source: string[];
  subtitle_language: string[];
  subtitle_type: string[];
  remark: string | null;
  unlock_points: number | null;
  unlocked_users_count: number | null;
  validate_status: string | null;
  validate_message: string | null;
  last_validated_at: string | null;
  is_official: boolean | null;
  is_unlocked: boolean;
  user: {
    id: number;
    nickname: string;
    avatar_url: string;
  } | null;
  created_at: string;
};

export type HDHiveResourceListResponse = {
  success: boolean;
  data: HDHiveResource[];
};

export type HDHiveUnlockResponse = {
  success: boolean;
  code: string;
  message: string;
  data: {
    slug: string;
    url: string;
    access_code: string | null;
    full_url: string | null;
    already_owned: boolean;
  };
};

export type HDHiveShareDetailResponse = {
  success: boolean;
  code: string;
  message: string;
  data: {
    slug: string;
    pan_type: string | null;
    title: string | null;
    unlock_points: number | null;
    validate_status: string | null;
  };
};

export type HDHiveCheckinResponse = {
  success: boolean;
  code: string;
  message: string;
  data: {
    checked_in: boolean;
    message: string;
  };
};

class HDHiveClient {
  private http: AxiosInstance;

  constructor() {
    const proxyAgent = getProxyAgent();
    this.http = axios.create({
      baseURL: 'https://hdhive.com',
      timeout: 15000,
      httpAgent: proxyAgent,
      httpsAgent: proxyAgent,
      proxy: false,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private shouldRotateForGeneralRequest(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;
    const status = error.response?.status ?? null;
    return status === 401 || status === 403 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }

  private shouldRotateForUnlockRequest(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;

    const status = error.response?.status ?? null;
    const code = error.response?.data?.code as string | undefined;

    // 解锁请求是有副作用操作：
    // 仅在明确与 key/配额相关的情况下切换 key，避免 5xx/超时导致的重复副作用重试。
    if (status === 401 || status === 403 || status === 429) {
      return true;
    }

    if (code === 'INVALID_API_KEY' || code === 'DISABLED_API_KEY' || code === 'EXPIRED_API_KEY' || code === 'ENDPOINT_QUOTA_EXCEEDED' || code === 'RATE_LIMIT_EXCEEDED') {
      return true;
    }

    return false;
  }

  private async requestWithApiKeyRotation<T>(config: AxiosRequestConfig, mode: 'general' | 'unlock' = 'general'): Promise<T> {
    const { primaryKeys, fallbackKey, mode: apiMode, activeKey } = apiKeyConfigService.getRotationState();
    const candidates = apiMode === 'manual'
      ? [activeKey ?? primaryKeys[0]].filter(Boolean) as string[]
      : [...primaryKeys, ...(fallbackKey ? [fallbackKey] : [])];
    let lastError: unknown;

    for (const apiKey of candidates) {
      try {
        const res = await this.http.request<T>({
          ...config,
          headers: {
            ...(config.headers ?? {}),
            'X-API-Key': apiKey,
          },
        });
        return res.data;
      } catch (error) {
        lastError = error;
        const shouldRotate = mode === 'unlock'
          ? this.shouldRotateForUnlockRequest(error)
          : this.shouldRotateForGeneralRequest(error);

        if (!shouldRotate) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  async getMe(): Promise<HDHiveMeResponse> {
    return this.requestWithApiKeyRotation<HDHiveMeResponse>({ method: 'GET', url: '/api/open/me' });
  }

  async getMeByApiKey(apiKey: string): Promise<HDHiveMeResponse> {
    const res = await this.http.request<HDHiveMeResponse>({
      method: 'GET',
      url: '/api/open/me',
      headers: {
        'X-API-Key': apiKey,
      },
    });
    return res.data;
  }

  async getQuota(): Promise<HDHiveQuotaResponse> {
    return this.requestWithApiKeyRotation<HDHiveQuotaResponse>({ method: 'GET', url: '/api/open/quota' });
  }

  async getUsageToday(): Promise<HDHiveUsageTodayResponse> {
    return this.requestWithApiKeyRotation<HDHiveUsageTodayResponse>({ method: 'GET', url: '/api/open/usage/today' });
  }

  async getWeeklyFreeQuota(): Promise<HDHiveWeeklyFreeQuotaResponse> {
    return this.requestWithApiKeyRotation<HDHiveWeeklyFreeQuotaResponse>({ method: 'GET', url: '/api/open/vip/weekly-free-quota' });
  }

  async getResourcesByTmdb(mediaType: 'movie' | 'tv', tmdbId: string): Promise<HDHiveResource[]> {
    const res = await this.requestWithApiKeyRotation<HDHiveResourceListResponse>({
      method: 'GET',
      url: `/api/open/resources/${mediaType}/${tmdbId}`,
    });
    return res.data ?? [];
  }

  async unlockResource(slug: string): Promise<HDHiveUnlockResponse> {
    return this.requestWithApiKeyRotation<HDHiveUnlockResponse>({
      method: 'POST',
      url: '/api/open/resources/unlock',
      data: { slug },
    }, 'unlock');
  }

  async getShareDetail(slug: string): Promise<HDHiveShareDetailResponse> {
    return this.requestWithApiKeyRotation<HDHiveShareDetailResponse>({
      method: 'GET',
      url: `/api/open/shares/${slug}`,
    });
  }
}

export const hdhiveClient = new HDHiveClient();
