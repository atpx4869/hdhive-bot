export type ParsedCallback =
  | { type: 'help_example' }
  | { type: 'help_usage' }
  | { type: 'nav_search' }
  | { type: 'pick'; sessionId: string; candidateIndex: number }
  | { type: 'nav_candidates'; candidateSessionId: string }
  | { type: 'page'; sessionId: string; page: number }
  | { type: 'detail'; sessionId: string; slug: string; page: number }
  | { type: 'unlock'; slug: string; sessionId: string; page: number }
  | { type: 'forward_bot_open'; sessionId: string; page: number }
  | { type: 'toggle_ali'; sessionId: string; page: number }
  | { type: 'toggle_115'; sessionId: string; page: number }
  | { type: 'nav_back'; sessionId: string; page: number }
  | { type: 'admin_me' }
  | { type: 'admin_quota' }
  | { type: 'admin_users' }
  | { type: 'admin_api_key' }
  | { type: 'admin_api_mode'; mode: 'auto' | 'manual' }
  | { type: 'admin_api_active'; index: number }
  | { type: 'admin_api_delete'; index: number }
  | { type: 'admin_api_set_fallback'; index: number }
  | { type: 'admin_api_clear_fallback' };
