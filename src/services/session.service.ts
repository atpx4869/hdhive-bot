import { randomUUID } from 'crypto';
import type { CandidateSession, ResultSession } from '../types/resource.js';
import { logger } from '../utils/logger.js';

const SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutes

const candidateSessions = new Map<string, CandidateSession>();
const resultSessions = new Map<string, ResultSession>();

function generateId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12);
}

function isExpired(createdAt: number): boolean {
  return Date.now() - createdAt > SESSION_TTL_MS;
}

function touch<T extends { createdAt: number }>(session: T): T {
  return { ...session, createdAt: Date.now() };
}

export const sessionService = {
  createCandidateSession(data: Omit<CandidateSession, 'createdAt'>): string {
    const id = generateId();
    candidateSessions.set(id, { ...data, createdAt: Date.now() });
    logger.debug('SessionService', `Created candidate session id=${id} user=${data.telegramUserId}`);
    return id;
  },

  getCandidateSession(sessionId: string): CandidateSession | null {
    const s = candidateSessions.get(sessionId);
    if (!s || isExpired(s.createdAt)) {
      candidateSessions.delete(sessionId);
      logger.debug('SessionService', `Candidate session expired/missing id=${sessionId}`);
      return null;
    }
    const touched = touch(s);
    candidateSessions.set(sessionId, touched);
    return touched;
  },

  createResultSession(data: Omit<ResultSession, 'createdAt'>): string {
    const id = generateId();
    resultSessions.set(id, { ...data, createdAt: Date.now() });
    logger.debug('SessionService', `Created result session id=${id} user=${data.telegramUserId} items=${data.items.length}`);
    return id;
  },

  getResultSession(sessionId: string): ResultSession | null {
    const s = resultSessions.get(sessionId);
    if (!s || isExpired(s.createdAt)) {
      resultSessions.delete(sessionId);
      logger.debug('SessionService', `Result session expired/missing id=${sessionId}`);
      return null;
    }
    const touched = touch(s);
    resultSessions.set(sessionId, touched);
    return touched;
  },

  updateResultSession(sessionId: string, updater: (session: ResultSession) => ResultSession): ResultSession | null {
    const current = resultSessions.get(sessionId);
    if (!current || isExpired(current.createdAt)) {
      resultSessions.delete(sessionId);
      logger.debug('SessionService', `Result session expired/missing on update id=${sessionId}`);
      return null;
    }
    const next = touch(updater(current));
    resultSessions.set(sessionId, next);
    return next;
  },
};
