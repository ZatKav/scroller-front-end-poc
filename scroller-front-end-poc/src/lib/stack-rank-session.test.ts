import {
  clearStackRank,
  getStackRank,
  setStackRank,
  STACK_RANK_SESSION_MAX_ENTRIES,
  STACK_RANK_SESSION_TTL_MS,
} from '@/lib/stack-rank-session';

const SAMPLE_IMAGES = [
  { id: 1, image_data: 'data:image/png;base64,AAA=', image_summary: 'A property' },
];

afterEach(() => {
  for (let userId = 1; userId <= STACK_RANK_SESSION_MAX_ENTRIES + 1; userId += 1) {
    clearStackRank(userId);
  }

  jest.useRealTimers();
});

describe('stack-rank-session', () => {
  it('returns stored images before they expire', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-25T10:00:00Z'));

    setStackRank(1, SAMPLE_IMAGES);

    expect(getStackRank(1)).toEqual(SAMPLE_IMAGES);
  });

  it('expires entries after the configured ttl', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-25T10:00:00Z'));

    setStackRank(1, SAMPLE_IMAGES);
    jest.setSystemTime(new Date(Date.now() + STACK_RANK_SESSION_TTL_MS + 1));

    expect(getStackRank(1)).toBeUndefined();
  });

  it('evicts the oldest cached session when the store limit is exceeded', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-25T10:00:00Z'));

    for (let userId = 1; userId <= STACK_RANK_SESSION_MAX_ENTRIES + 1; userId += 1) {
      setStackRank(userId, [{ id: userId, image_data: null, image_summary: `Image ${userId}` }]);
    }

    expect(getStackRank(1)).toBeUndefined();
    expect(getStackRank(STACK_RANK_SESSION_MAX_ENTRIES + 1)).toEqual([
      { id: STACK_RANK_SESSION_MAX_ENTRIES + 1, image_data: null, image_summary: `Image ${STACK_RANK_SESSION_MAX_ENTRIES + 1}` },
    ]);
  });
});
