import {
  appendUniqueListings,
  createListingStackRankQueue,
  fetchListingStackRankQueue,
  LISTING_STACK_RANK_QUEUE_LIMIT,
  mergeListingStackRankQueue,
  preserveListingStackRankQueueAfterError,
} from '@/lib/listing-stack-rank-queue';
import type { ListingDetail } from '@/types/enrichment-db';

const mockFetch = jest.fn();

function makeListing(id: number): ListingDetail {
  return { id, title: `Listing ${id}` };
}

beforeEach(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockReset();
});

describe('appendUniqueListings', () => {
  it('deduplicates by listing id while preserving ranked order', () => {
    const listings = appendUniqueListings(
      [makeListing(1), makeListing(2)],
      [makeListing(2), makeListing(3), makeListing(1), makeListing(4)],
    );

    expect(listings.map((listing) => listing.id)).toEqual([1, 2, 3, 4]);
  });
});

describe('createListingStackRankQueue', () => {
  it('keeps the current listing plus the next five listings preloaded', () => {
    const queue = createListingStackRankQueue({
      listings: [makeListing(1), makeListing(2), makeListing(3), makeListing(4), makeListing(5)],
      profile_weights: { 'bedrooms:3': 0.7 },
    });

    expect(queue.status).toBe('ready');
    expect(queue.currentListing?.id).toBe(1);
    expect(queue.preloadedListings.map((listing) => listing.id)).toEqual([2, 3, 4, 5]);
    expect(queue.listings.map((listing) => listing.id)).toEqual([1, 2, 3, 4, 5]);
    expect(queue.profileWeights).toEqual({ 'bedrooms:3': 0.7 });
    expect(LISTING_STACK_RANK_QUEUE_LIMIT).toBe(6);
  });

  it('represents an empty response without a current listing id', () => {
    const queue = createListingStackRankQueue({ listings: [], profile_weights: {} });

    expect(queue).toMatchObject({
      status: 'empty',
      currentListing: null,
      preloadedListings: [],
      listings: [],
      error: null,
    });
  });
});

describe('mergeListingStackRankQueue', () => {
  it('adds only unseen listings and keeps the original current listing', () => {
    const initialQueue = createListingStackRankQueue({
      listings: [makeListing(10), makeListing(11), makeListing(12)],
      profile_weights: {},
    });

    const mergedQueue = mergeListingStackRankQueue(initialQueue, {
      listings: [makeListing(11), makeListing(13), makeListing(14)],
      profile_weights: { 'price:500000': 0.5 },
    });

    expect(mergedQueue.currentListing?.id).toBe(10);
    expect(mergedQueue.listings.map((listing) => listing.id)).toEqual([10, 11, 12, 13, 14]);
    expect(mergedQueue.preloadedListings.map((listing) => listing.id)).toEqual([11, 12, 13, 14]);
    expect(mergedQueue.profileWeights).toEqual({ 'price:500000': 0.5 });
  });
});

describe('preserveListingStackRankQueueAfterError', () => {
  it('preserves the current listing after an additional preload failure', () => {
    const initialQueue = createListingStackRankQueue({
      listings: [makeListing(20), makeListing(21)],
      profile_weights: { warm: 1 },
    });

    const failedQueue = preserveListingStackRankQueueAfterError(initialQueue);

    expect(failedQueue.status).toBe('ready');
    expect(failedQueue.currentListing?.id).toBe(20);
    expect(failedQueue.listings.map((listing) => listing.id)).toEqual([20, 21]);
    expect(failedQueue.error).toBe('Additional listings could not be loaded.');
  });

  it('represents an initial load failure for the later UI consumer', () => {
    const failedQueue = preserveListingStackRankQueueAfterError(null);

    expect(failedQueue.status).toBe('error');
    expect(failedQueue.currentListing).toBeNull();
    expect(failedQueue.listings).toEqual([]);
    expect(failedQueue.error).toBe('Listing queue could not be loaded.');
  });
});

describe('fetchListingStackRankQueue', () => {
  it('loads the internal BFF route through the configured app base path', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [makeListing(30)], profile_weights: {} }),
    } as Response);

    const queue = await fetchListingStackRankQueue();

    expect(mockFetch).toHaveBeenCalledWith('/api/listings/stack-rank?limit=6');
    expect(queue.currentListing?.id).toBe(30);
  });

  it('throws a stable error when the BFF route fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false } as Response);

    await expect(fetchListingStackRankQueue()).rejects.toThrow('Failed to load listing queue');
  });
});
