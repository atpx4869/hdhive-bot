import type { ParsedCallback } from '../types/callback.js';

const SEP = ':';

export const cb = {
  helpExample: () => 'help:example',
  helpUsage: () => 'help:usage',
  navSearch: () => 'nav:search',
  navCandidates: (candidateSessionId: string) => `nav:candidates${SEP}${candidateSessionId}`,
  pick: (sessionId: string, candidateIndex: number) =>
    `pick${SEP}${sessionId}${SEP}${candidateIndex}`,
  page: (sessionId: string, page: number) =>
    `page${SEP}${sessionId}${SEP}${page}`,
  detail: (sessionId: string, slug: string, page: number) =>
    `detail${SEP}${sessionId}${SEP}${slug}${SEP}${page}`,
  unlock: (slug: string, sessionId: string, page: number) =>
    `unlock${SEP}${slug}${SEP}${sessionId}${SEP}${page}`,
  forwardBotOpen: (sessionId: string, page: number) =>
    `forwardbot${SEP}${sessionId}${SEP}${page}`,
  toggleAli: (sessionId: string, page: number) =>
    `toggleali${SEP}${sessionId}${SEP}${page}`,
  toggle115: (sessionId: string, page: number) =>
    `toggle115${SEP}${sessionId}${SEP}${page}`,
  navBack: (sessionId: string, page: number) =>
    `nav:back${SEP}${sessionId}${SEP}${page}`,
  adminMe: () => 'admin:me',
  adminQuota: () => 'admin:quota',
  adminUsers: () => 'admin:users',
  adminApiKey: () => 'admin:apikey',
  adminApiMode: (mode: 'auto' | 'manual') => `admin:apimode${SEP}${mode}`,
  adminApiActive: (index: number) => `admin:apiactive${SEP}${index}`,
  adminApiDelete: (index: number) => `admin:apidelete${SEP}${index}`,
  adminApiSetFallback: (index: number) => `admin:apisetfallback${SEP}${index}`,
  adminApiClearFallback: () => 'admin:apiclearfallback',
};

export function parseCallbackData(data: string): ParsedCallback | null {
  if (data === 'help:example') return { type: 'help_example' };
  if (data === 'help:usage') return { type: 'help_usage' };
  if (data === 'nav:search') return { type: 'nav_search' };
  if (data === 'admin:me') return { type: 'admin_me' };
  if (data === 'admin:quota') return { type: 'admin_quota' };
  if (data === 'admin:users') return { type: 'admin_users' };
  if (data === 'admin:apikey') return { type: 'admin_api_key' };
  if (data === 'admin:apiclearfallback') return { type: 'admin_api_clear_fallback' };

  const parts = data.split(SEP);

  if (data.startsWith('admin:apimode') && parts.length === 3) {
    const mode = parts[2] === 'manual' ? 'manual' : 'auto';
    return { type: 'admin_api_mode', mode };
  }
  if (data.startsWith('admin:apiactive') && parts.length === 3) {
    return { type: 'admin_api_active', index: Number(parts[2]) };
  }
  if (data.startsWith('admin:apidelete') && parts.length === 3) {
    return { type: 'admin_api_delete', index: Number(parts[2]) };
  }
  if (data.startsWith('admin:apisetfallback') && parts.length === 3) {
    return { type: 'admin_api_set_fallback', index: Number(parts[2]) };
  }

  const ns = parts[0];

  if (data.startsWith('nav:candidates') && parts.length === 3) {
    return { type: 'nav_candidates', candidateSessionId: parts[2]! };
  }

  if (ns === 'pick' && parts.length === 3) {
    return { type: 'pick', sessionId: parts[1]!, candidateIndex: Number(parts[2]) };
  }
  if (ns === 'page' && parts.length === 3) {
    return { type: 'page', sessionId: parts[1]!, page: Number(parts[2]) };
  }
  if (ns === 'detail' && parts.length === 4) {
    return { type: 'detail', sessionId: parts[1]!, slug: parts[2]!, page: Number(parts[3]) };
  }
  if (ns === 'unlock' && parts.length === 4) {
    return { type: 'unlock', slug: parts[1]!, sessionId: parts[2]!, page: Number(parts[3]) };
  }
  if (ns === 'forwardbot' && parts.length === 3) {
    return { type: 'forward_bot_open', sessionId: parts[1]!, page: Number(parts[2]) };
  }
  if (ns === 'toggleali' && parts.length === 3) {
    return { type: 'toggle_ali', sessionId: parts[1]!, page: Number(parts[2]) };
  }
  if (ns === 'toggle115' && parts.length === 3) {
    return { type: 'toggle_115', sessionId: parts[1]!, page: Number(parts[2]) };
  }
  if (data.startsWith('nav:back') && parts.length === 4) {
    return { type: 'nav_back', sessionId: parts[2]!, page: Number(parts[3]) };
  }

  return null;
}
