export type ResourceCard = {
  slug: string;
  title: string;
  shareSize: string;
  resolutionText: string;
  sourceText: string;
  subtitleText: string;
  unlockText: string;
  validationText: string;
  originText: string;
  isUnlocked: boolean;
  unlockPoints: number | null;
  lastValidatedAt: string | null;
  unlockedUsersCount: number | null;
  remark: string | null;
  /** validate_status === 'invalid' → 疑似失效/不可用 */
  isInvalid: boolean;
  panType: string | null;
  panQueried: boolean;
};

export type TmdbCandidate = {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  originalTitle?: string | undefined;
  year?: string | undefined;
  overview?: string | undefined;
};

export type CandidateSession = {
  telegramUserId: string;
  query: string;
  candidates: TmdbCandidate[];
  createdAt: number;
};

export type ResultSession = {
  telegramUserId: string;
  query: string;
  candidate: TmdbCandidate;
  candidateSessionId: string;
  items: ResourceCard[];
  pageSize: number;
  createdAt: number;
  enrichedUntil?: number;
  panTypeReady?: boolean;
  viewMode?: '115' | 'aliyun';
};

export type PagePresentation = {
  pageItems: ResourceCard[];
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  shown115Items: ResourceCard[];
  aliItems: ResourceCard[];
  totalAliCount: number;
  viewMode: '115' | 'aliyun';
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

export type UnlockResultView = {
  status: 'success' | 'already_owned' | 'free' | 'insufficient_points' | 'error';
  url?: string | undefined;
  accessCode?: string | undefined;
  fullUrl?: string | undefined;
  message?: string | undefined;
};
