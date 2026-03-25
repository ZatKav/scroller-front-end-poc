import type { StackRankImage } from '@/types/scroller-customer-interactions-db';

const sessionStore = new Map<number, StackRankImage[]>();

export function getStackRank(userId: number): StackRankImage[] | undefined {
  return sessionStore.get(userId);
}

export function setStackRank(userId: number, images: StackRankImage[]): void {
  sessionStore.set(userId, images);
}
