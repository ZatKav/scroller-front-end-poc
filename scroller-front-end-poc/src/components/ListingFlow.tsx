'use client';

import { useEffect, useRef, useState } from 'react';
import ListingDetailContent from '@/components/ListingDetailContent';
import ZelliBottomNav from '@/components/ZelliBottomNav';
import { scrollerCustomerInteractionsDbApiClient } from '@/app/shared/clients/scroller-customer-interactions-db-api-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  appendUniqueListings,
  LISTING_STACK_RANK_QUEUE_LIMIT,
} from '@/lib/listing-stack-rank-queue';
import { appPath } from '@/lib/base-path';
import { mapListingToView } from '@/lib/listing-detail-view';
import type { ListingDetail } from '@/types/enrichment-db';

// Fetch just the first listing on entry so it paints fast, then hydrate the rest
// of the preload buffer (LISTING_STACK_RANK_QUEUE_LIMIT) in the background.
const INITIAL_LOAD_LIMIT = 1;
const CONTINUATION_LOAD_LIMIT = LISTING_STACK_RANK_QUEUE_LIMIT;
const PREFETCH_THRESHOLD = 2;

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
  const { user } = useAuth();
  const [listings, setListings] = useState<ListingDetail[]>(
    initialListing ? [initialListing] : [],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [initialLoading, setInitialLoading] = useState(initialListing === null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resettingPreferences, setResettingPreferences] = useState(false);
  const listingShownAtMsRef = useRef(Date.now());
  // Mirrors `listings` so the merge path can read the current value without
  // depending on a state updater's argument.
  const listingsRef = useRef<ListingDetail[]>(initialListing ? [initialListing] : []);
  const mountedRef = useRef(false);
  const refillInFlightRef = useRef(false);
  const actionInFlightRef = useRef(false);
  const queueGenerationRef = useRef(0);

  const currentListing = listings[currentIndex] ?? null;

  useEffect(() => {
    listingShownAtMsRef.current = Date.now();
  }, [currentListing?.id]);

  useEffect(() => {
    // Update the address bar to the current listing without a route navigation:
    // a router.push/replace here would remount this component via the
    // /listings/[id] segment (re-fetching the listing and flashing its loading
    // skeleton) on every advance. history.replaceState keeps the persistent
    // client queue — and its prefetch — intact so advancing is instant, while a
    // refresh/deep-link still resolves the /listings/[id] route server-side.
    if (!currentListing || typeof window === 'undefined') {
      return;
    }

    // Defer until parent effects have installed Next's history wrapper.
    const timeoutId = window.setTimeout(() => {
      window.history.replaceState(
        window.history.state,
        '',
        appPath(`/listings/${currentListing.id}`),
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [currentListing]);

  async function loadMoreListings(limit: number, initial = false) {
    if (refillInFlightRef.current) {
      return;
    }

    const queueGeneration = queueGenerationRef.current;
    refillInFlightRef.current = true;
    setLoadingMore(!initial);
    setQueueError(null);

    try {
      const { listings: windowListings } = await fetchListingWindow(limit);
      if (!mountedRef.current || queueGeneration !== queueGenerationRef.current) {
        return;
      }

      // Merge against the ref rather than inside a setListings updater. Calling
      // setNoMoreListings from within an updater made that updater impure, so a
      // repeated invocation could latch "no more listings" from a stale
      // comparison.
      const previousListings = listingsRef.current;
      const mergedListings = appendUniqueListings(previousListings, windowListings);
      listingsRef.current = mergedListings;
      setListings(mergedListings);
      // Nothing to latch here: the "no more listings" screen is driven by there
      // being no current listing, and an empty continuation is treated as
      // transient so a later attempt can still return more.
    } catch {
      if (!mountedRef.current || queueGeneration !== queueGenerationRef.current) {
        return;
      }

      setQueueError(initial ? 'Failed to load listings.' : 'More listings could not be loaded.');
    } finally {
      if (queueGeneration !== queueGenerationRef.current) {
        return;
      }

      refillInFlightRef.current = false;
      if (mountedRef.current) {
        setInitialLoading(false);
        setLoadingMore(false);
      }
    }
  }

  async function reloadListingQueue(limit: number) {
    const queueGeneration = queueGenerationRef.current + 1;
    queueGenerationRef.current = queueGeneration;
    refillInFlightRef.current = true;
    setLoadingMore(false);

    try {
      const { listings: windowListings } = await fetchListingWindow(limit);
      if (!mountedRef.current || queueGeneration !== queueGenerationRef.current) {
        return;
      }

      const uniqueListings = appendUniqueListings([], windowListings);
      listingsRef.current = uniqueListings;
      setListings(uniqueListings);
      setCurrentIndex(0);
    } catch {
      if (!mountedRef.current || queueGeneration !== queueGenerationRef.current) {
        return;
      }

      listingsRef.current = [];
      setListings([]);
      setCurrentIndex(0);
      setQueueError('Failed to load listings.');
    } finally {
      if (queueGeneration !== queueGenerationRef.current) {
        return;
      }

      refillInFlightRef.current = false;
      if (mountedRef.current) {
        setInitialLoading(false);
        setLoadingMore(false);
      }
    }
  }

  // Top the queue up as the user approaches the end of what is buffered.
  //
  // This runs as an effect rather than inside the setCurrentIndex updater it
  // used to live in. A state updater must be pure: React can invoke it more
  // than once for a single update, which would fire duplicate continuation
  // requests, and it made the fetch decision read a stale `listings.length`
  // captured by the enclosing render.
  //
  // `noMoreListings` is deliberately NOT a guard here. An exhausted
  // continuation is treated as transient: recording a preference changes what
  // the upstream ranker considers unseen, so a later attempt can legitimately
  // return more (covered by the post-action loading-state test). The retry is
  // naturally bounded — once the buffer is spent there is no current listing,
  // so no action buttons remain to press.
  useEffect(() => {
    if (initialLoading || queueError !== null) {
      return;
    }
    if (listings.length - currentIndex > PREFETCH_THRESHOLD) {
      return;
    }
    void loadMoreListings(CONTINUATION_LOAD_LIMIT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, listings.length, queueError, initialLoading]);

  function advanceQueue() {
    setActionError(null);
    setCurrentIndex((previousIndex) => previousIndex + 1);
  }

  async function recordPreference(action: 0 | 1 | 2) {
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

  async function deleteListingPreferences() {
    if (!user || resettingPreferences) {
      return;
    }

    setResettingPreferences(true);
    setActionError(null);
    setQueueError(null);

    try {
      await scrollerCustomerInteractionsDbApiClient.deleteCustomerListingInteractions(user.id);
      listingsRef.current = [];
      setListings([]);
      setCurrentIndex(0);
      setInitialLoading(true);
      await reloadListingQueue(CONTINUATION_LOAD_LIMIT);
    } catch (error) {
      console.error('Failed to delete listing preferences:', error);
      setActionError('Could not delete listing preferences. Please try again.');
    } finally {
      setResettingPreferences(false);
      if (mountedRef.current) {
        setInitialLoading(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    void (async () => {
      // First paint: fetch only the first listing so it appears quickly.
      if (initialListing === null) {
        await loadMoreListings(INITIAL_LOAD_LIMIT, true);
      }
      // Then hydrate the preload buffer in the background (current + 5 ahead).
      if (mountedRef.current) {
        void loadMoreListings(CONTINUATION_LOAD_LIMIT);
      }
    })();

    return () => {
      mountedRef.current = false;
    };
    // Mount-only on purpose: this seeds the queue once. `initialListing` is a
    // server-rendered prop for this mount, and re-running on a change to it
    // would re-seed a queue the user is already partway through.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (initialLoading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-zelli-bg px-4 py-8">
        <p className="text-zelli-muted">Loading listings...</p>
      </main>
    );
  }

  if (!currentListing && loadingMore) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-zelli-bg px-4 py-8">
        <p role="status" className="text-zelli-muted">Loading more listings...</p>
      </main>
    );
  }

  if (!currentListing) {
    return (
      <>
        <main className="flex min-h-[100dvh] items-center justify-center bg-zelli-bg px-6 pb-24 pt-8">
          <section className="w-full max-w-[420px] rounded-zelli-card border border-zelli-border bg-zelli-surface p-6 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-zelli-ink">No more listings</h1>
            <p className="mt-3 text-sm text-zelli-muted">
              There are no more listings to review right now.
            </p>
            {queueError && <p className="mt-4 text-sm text-zelli-primary">{queueError}</p>}
          </section>
        </main>
        <ZelliBottomNav active="feed" />
      </>
    );
  }

  const feedHeader = (
    <div>
      <h1 className="text-[26px] font-bold leading-tight text-zelli-accent">Homes for you</h1>
      <p className="mt-1 text-sm text-zelli-ink">
        Skip or save &mdash; every choice helps Zelli learn.
      </p>
    </div>
  );

  const controls = (
    <div className="flex w-full flex-col gap-4 pt-1">
      <div className="flex items-start justify-center gap-8">
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            aria-label="Skip"
            onClick={() => recordPreference(0)}
            disabled={submitting || resettingPreferences}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-zelli-border bg-zelli-surface text-2xl leading-none text-zelli-ink transition-colors hover:border-zelli-ink focus:outline-none focus:ring-2 focus:ring-zelli-ink focus:ring-offset-2 focus:ring-offset-zelli-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden>&#10005;</span>
          </button>
          <span className="text-[11px] font-bold text-zelli-ink">Skip</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            aria-label="Maybe"
            onClick={() => recordPreference(2)}
            disabled={submitting || resettingPreferences}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-zelli-border bg-zelli-surface text-2xl leading-none text-zelli-ink transition-colors hover:border-zelli-ink focus:outline-none focus:ring-2 focus:ring-zelli-ink focus:ring-offset-2 focus:ring-offset-zelli-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden>?</span>
          </button>
          <span className="text-[11px] font-bold text-zelli-ink">Maybe</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            aria-label="Save"
            onClick={() => recordPreference(1)}
            disabled={submitting || resettingPreferences}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-zelli-primary text-2xl leading-none text-white transition-colors hover:bg-zelli-primary-hover focus:outline-none focus:ring-2 focus:ring-zelli-primary focus:ring-offset-2 focus:ring-offset-zelli-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden>&#9829;</span>
          </button>
          <span className="text-[11px] font-bold text-zelli-ink">Save</span>
        </div>
      </div>

      {loadingMore && (
        <p role="status" className="text-center text-sm text-zelli-muted">
          Loading more listings...
        </p>
      )}
      {queueError && (
        <p role="status" className="text-center text-sm text-zelli-primary">
          {queueError}
        </p>
      )}
      {actionError && (
        <p role="status" className="text-center text-sm text-zelli-primary">
          {actionError}
        </p>
      )}

      {/* Debug-only affordance: deleting preferences wipes the customer's whole
          interaction history and is not something a real user should reach for,
          so it is rendered in red to read as a developer control rather than a
          normal action. */}
      <button
        type="button"
        onClick={deleteListingPreferences}
        disabled={submitting || resettingPreferences}
        className="mx-auto text-sm font-bold text-red-600 underline-offset-4 hover:text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {resettingPreferences ? 'Deleting preferences...' : 'Delete preferences'}
      </button>
    </div>
  );

  return (
    <>
      <ListingDetailContent
        view={mapListingToView(currentListing)}
        header={feedHeader}
        footer={controls}
      />
      <ZelliBottomNav active="feed" />
    </>
  );
}
