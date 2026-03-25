import { AUTH_TOKEN_MAX_AGE_SECONDS } from '@/lib/auth';
import type { StackRankImage } from '@/types/scroller-customer-interactions-db';

interface StackRankSessionEntry {
  images: StackRankImage[];
  expiresAt: number;
}

export const STACK_RANK_SESSION_TTL_MS = AUTH_TOKEN_MAX_AGE_SECONDS * 1000;
export const STACK_RANK_SESSION_MAX_ENTRIES = 100;

const sessionStore = new Map<number, StackRankSessionEntry>();

function removeExpiredSessions(now: number): void {
  for (const [userId, entry] of sessionStore.entries()) {
    if (entry.expiresAt <= now) {
      sessionStore.delete(userId);
    }
  }
}

function enforceSessionLimit(): void {
  while (sessionStore.size > STACK_RANK_SESSION_MAX_ENTRIES) {
    const oldestUserId = sessionStore.keys().next().value;
    if (oldestUserId === undefined) {
      return;
    }
    sessionStore.delete(oldestUserId);
  }
}

export function getStackRank(userId: number): StackRankImage[] | undefined {
  const now = Date.now();
  removeExpiredSessions(now);

  const session = sessionStore.get(userId);
  return session?.images;
}

export function setStackRank(userId: number, images: StackRankImage[]): void {
  const now = Date.now();
  removeExpiredSessions(now);

  // Entries hold base64 image data, so keep the in-memory cache bounded and refresh recency on write.
  sessionStore.delete(userId);
  sessionStore.set(userId, {
    images,
    expiresAt: now + STACK_RANK_SESSION_TTL_MS,
  });
  enforceSessionLimit();
}

export function clearStackRank(userId: number): void {
  sessionStore.delete(userId);
}
