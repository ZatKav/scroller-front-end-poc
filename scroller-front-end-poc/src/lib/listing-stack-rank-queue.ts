import { appPath } from '@/lib/base-path';
import type { ListingDetail } from '@/types/enrichment-db';
import type {
  ListingStackRankResponse,
  StackRankProfileWeights,
} from '@/types/scroller-customer-interactions-db';

export const LISTING_STACK_RANK_PRELOAD_COUNT = 3;
export const LISTING_STACK_RANK_QUEUE_LIMIT = LISTING_STACK_RANK_PRELOAD_COUNT + 1;

export type ListingStackRankQueueStatus = 'ready' | 'empty' | 'error';

export interface ListingStackRankQueueState {
  status: ListingStackRankQueueStatus;
  listings: ListingDetail[];
  currentListing: ListingDetail | null;
  preloadedListings: ListingDetail[];
  profileWeights: StackRankProfileWeights;
  error: string | null;
}

export function appendUniqueListings(
  existingListings: ListingDetail[],
  windowListings: ListingDetail[],
): ListingDetail[] {
  const seenListingIds = new Set(existingListings.map((listing) => listing.id));
  const newListings = windowListings.filter((listing) => {
    if (seenListingIds.has(listing.id)) {
      return false;
    }
    seenListingIds.add(listing.id);
    return true;
  });
  return [...existingListings, ...newListings];
}

export function createListingStackRankQueue(
  response: ListingStackRankResponse,
): ListingStackRankQueueState {
  const listings = appendUniqueListings([], response.listings);
  const currentListing = listings[0] ?? null;

  return {
    status: currentListing === null ? 'empty' : 'ready',
    listings,
    currentListing,
    preloadedListings: listings.slice(1, LISTING_STACK_RANK_QUEUE_LIMIT),
    profileWeights: response.profile_weights,
    error: null,
  };
}

export function mergeListingStackRankQueue(
  previousState: ListingStackRankQueueState,
  response: ListingStackRankResponse,
): ListingStackRankQueueState {
  const listings = appendUniqueListings(previousState.listings, response.listings);
  const currentListing = listings[0] ?? null;

  return {
    status: currentListing === null ? 'empty' : 'ready',
    listings,
    currentListing,
    preloadedListings: listings.slice(1, LISTING_STACK_RANK_QUEUE_LIMIT),
    profileWeights: response.profile_weights,
    error: null,
  };
}

export function preserveListingStackRankQueueAfterError(
  previousState: ListingStackRankQueueState | null,
): ListingStackRankQueueState {
  if (previousState === null) {
    return {
      status: 'error',
      listings: [],
      currentListing: null,
      preloadedListings: [],
      profileWeights: {},
      error: 'Listing queue could not be loaded.',
    };
  }

  return {
    ...previousState,
    status: previousState.currentListing === null ? 'error' : 'ready',
    error: 'Additional listings could not be loaded.',
  };
}

export async function fetchListingStackRankQueue(
  limit = LISTING_STACK_RANK_QUEUE_LIMIT,
): Promise<ListingStackRankQueueState> {
  const response = await fetch(appPath(`/api/listings/stack-rank?limit=${limit}`));
  if (!response.ok) {
    throw new Error('Failed to load listing queue');
  }

  const data = (await response.json()) as Partial<ListingStackRankResponse>;
  return createListingStackRankQueue({
    listings: data.listings ?? [],
    profile_weights: data.profile_weights ?? {},
  });
}
