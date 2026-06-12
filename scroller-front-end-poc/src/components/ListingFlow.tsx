'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ListingDetailContent from '@/components/ListingDetailContent';
import { scrollerCustomerInteractionsDbApiClient } from '@/app/shared/clients/scroller-customer-interactions-db-api-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  appendUniqueListings,
  LISTING_STACK_RANK_QUEUE_LIMIT,
} from '@/lib/listing-stack-rank-queue';
import { appPath } from '@/lib/base-path';
import { mapListingToView } from '@/lib/listing-detail-view';
import type { ListingDetail } from '@/types/enrichment-db';

const CONTINUATION_LOAD_LIMIT = LISTING_STACK_RANK_QUEUE_LIMIT;
const PREFETCH_THRESHOLD = 1;

interface ListingFlowProps {
  initialListing?: ListingDetail | null;
}

interface ListingStackRankWindow {
  listings: ListingDetail[];
}

async function fetchListingWindow(limit: number): Promise<ListingStackRankWindow> {
  const response = await fetch(appPath(`/api/listings/stack-rank?limit=${limit}`));
  if (!response.ok) {
    throw new Error('Failed to load listing queue');
  }

  const data = (await response.json()) as Partial<ListingStackRankWindow>;
  return { listings: data.listings ?? [] };
}

export default function ListingFlow({ initialListing = null }: ListingFlowProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [listings, setListings] = useState<ListingDetail[]>(
    initialListing ? [initialListing] : [],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [initialLoading, setInitialLoading] = useState(initialListing === null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [noMoreListings, setNoMoreListings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const listingShownAtMsRef = useRef(Date.now());
  const mountedRef = useRef(false);
  const refillInFlightRef = useRef(false);
  const actionInFlightRef = useRef(false);

  const currentListing = listings[currentIndex] ?? null;

  useEffect(() => {
    listingShownAtMsRef.current = Date.now();
  }, [currentListing?.id]);

  useEffect(() => {
    if (currentListing) {
      router.replace(`/listings/${currentListing.id}`);
    }
  }, [currentListing, router]);

  async function loadMoreListings(limit: number, initial = false) {
    if (refillInFlightRef.current) {
      return;
    }

    refillInFlightRef.current = true;
    setLoadingMore(!initial);
    setQueueError(null);

    try {
      const { listings: windowListings } = await fetchListingWindow(limit);
      if (!mountedRef.current) {
        return;
      }

      setListings((previousListings) => {
        const mergedListings = appendUniqueListings(previousListings, windowListings);
        setNoMoreListings(mergedListings.length === previousListings.length);
        return mergedListings;
      });
    } catch {
      if (!mountedRef.current) {
        return;
      }

      setQueueError(initial ? 'Failed to load listings.' : 'More listings could not be loaded.');
    } finally {
      refillInFlightRef.current = false;
      if (mountedRef.current) {
        setInitialLoading(false);
        setLoadingMore(false);
      }
    }
  }

  function maybePrefetch(nextIndex: number) {
    const remainingListings = listings.length - nextIndex;
    if (queueError !== null || noMoreListings || remainingListings > PREFETCH_THRESHOLD) {
      return;
    }

    void loadMoreListings(CONTINUATION_LOAD_LIMIT);
  }

  function advanceQueue() {
    setActionError(null);
    setCurrentIndex((previousIndex) => {
      const nextIndex = previousIndex + 1;
      maybePrefetch(nextIndex);
      return nextIndex;
    });
  }

  async function recordPreference(action: 0 | 1) {
    if (!currentListing || !user || actionInFlightRef.current) {
      return;
    }

    actionInFlightRef.current = true;
    setSubmitting(true);
    setActionError(null);

    try {
      const nowMs = Date.now();
      const viewDurationMs = Math.max(0, Math.floor(nowMs - listingShownAtMsRef.current));
      await scrollerCustomerInteractionsDbApiClient.createCustomerListingInteraction({
        customer_id: user.id,
        listing_id: currentListing.id,
        action,
        view_duration_ms: viewDurationMs,
      });
      advanceQueue();
    } catch (error) {
      console.error('Failed to record listing interaction:', error);
      setActionError('Could not record that choice. Please try again.');
    } finally {
      actionInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    void loadMoreListings(CONTINUATION_LOAD_LIMIT, initialListing === null);

    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (initialLoading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
        <p className="text-gray-600">Loading listings...</p>
      </main>
    );
  }

  if (!currentListing) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
        <section className="w-full max-w-md rounded-lg border border-white/70 bg-white/85 p-6 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-950">No more listings</h1>
          <p className="mt-3 text-sm text-gray-600">
            There are no more listings to review right now.
          </p>
          {queueError && <p className="mt-4 text-sm text-red-600">{queueError}</p>}
        </section>
      </main>
    );
  }

  const controls = (
    <div className="flex w-full flex-col gap-3 pb-4">
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => recordPreference(0)}
          disabled={submitting}
          className="min-w-28 rounded-lg bg-gray-200 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => recordPreference(1)}
          disabled={submitting}
          className="min-w-28 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Like
        </button>
        <button
          type="button"
          onClick={advanceQueue}
          disabled={submitting}
          className="min-w-28 rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
      {loadingMore && (
        <p role="status" className="text-center text-sm text-gray-600">
          Loading more listings...
        </p>
      )}
      {queueError && (
        <p role="status" className="text-center text-sm text-red-600">
          {queueError}
        </p>
      )}
      {actionError && (
        <p role="status" className="text-center text-sm text-red-600">
          {actionError}
        </p>
      )}
    </div>
  );

  return (
    <ListingDetailContent view={mapListingToView(currentListing)} footer={controls} />
  );
}
