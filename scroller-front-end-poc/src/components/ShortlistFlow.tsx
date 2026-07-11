'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { scrollerCustomerInteractionsDbApiClient } from '@/app/shared/clients/scroller-customer-interactions-db-api-client';
import { appPath } from '@/lib/base-path';
import { mapListingToView, type ListingDetailView } from '@/lib/listing-detail-view';
import { formatRelativeDay } from '@/lib/relative-time';
import ShortlistCard from '@/components/ShortlistCard';
import ZelliBottomNav from '@/components/ZelliBottomNav';
import ZelliWordmark from '@/components/ZelliWordmark';
import type { ListingDetail } from '@/types/enrichment-db';

type Tab = 'saved' | 'maybe';

// Save = action 1, Maybe = action 2 (see CustomerListingInteractionCreate).
const TAB_ACTION: Record<Tab, 1 | 2> = { saved: 1, maybe: 2 };

const TAB_COPY: Record<Tab, { subtitle: string; emptyTitle: string; emptyBody: string }> = {
  saved: {
    subtitle: 'Keep track of homes that caught your eye.',
    emptyTitle: 'No saved homes yet',
    emptyBody: 'When a home feels right, tap Save and it’ll appear here.',
  },
  maybe: {
    subtitle: 'Come back to homes you’re still thinking about.',
    emptyTitle: 'No maybes yet',
    emptyBody: 'Homes you mark as Maybe will appear here.',
  },
};

interface ShortlistItem {
  view: ListingDetailView;
  viewedAt: string;
}

async function fetchListing(listingId: number): Promise<ListingDetail | null> {
  try {
    const res = await fetch(appPath(`/api/listings/${listingId}`));
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as ListingDetail;
  } catch {
    return null;
  }
}

export default function ShortlistFlow() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('saved');
  const [items, setItems] = useState<ShortlistItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    setItems(null);
    setError(null);

    (async () => {
      try {
        const interactions =
          await scrollerCustomerInteractionsDbApiClient.getCustomerListingInteractions(
            user.id,
            0,
            100,
            TAB_ACTION[tab],
          );

        // At most one interaction per listing; the API returns newest first, so
        // keep the first occurrence of each listing id.
        const seen = new Set<number>();
        const unique = interactions.filter((interaction) => {
          if (seen.has(interaction.listing_id)) {
            return false;
          }
          seen.add(interaction.listing_id);
          return true;
        });

        const details = await Promise.all(
          unique.map(async (interaction) => {
            const listing = await fetchListing(interaction.listing_id);
            return listing
              ? { view: mapListingToView(listing), viewedAt: interaction.viewed_at }
              : null;
          }),
        );

        if (!cancelled) {
          setItems(details.filter((detail): detail is ShortlistItem => detail !== null));
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error('Failed to load shortlist:', loadError);
          setError('Could not load your shortlist. Please try again.');
          setItems([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, tab]);

  const copy = TAB_COPY[tab];

  return (
    <main className="min-h-[100dvh] bg-zelli-bg px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-24">
      <div className="mx-auto w-full max-w-[420px]">
        <header className="flex items-start justify-between">
          <ZelliWordmark />
          <Link
            href="/onboarding"
            aria-label="Preferences"
            className="mt-2 text-lg text-zelli-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-zelli-accent"
          >
            <span aria-hidden>⚙</span>
          </Link>
        </header>

        <h1 className="mt-8 text-[26px] font-bold leading-tight text-zelli-accent">My shortlist</h1>
        <p className="mt-1 text-sm text-zelli-ink">{copy.subtitle}</p>

        <div
          role="tablist"
          aria-label="Shortlist filter"
          className="mt-5 flex rounded-full border border-zelli-border bg-zelli-surface p-1"
        >
          {(['saved', 'maybe'] as Tab[]).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={tab === option}
              onClick={() => setTab(option)}
              className={`flex-1 rounded-full py-2 text-sm font-bold capitalize transition-colors ${
                tab === option ? 'bg-zelli-accent-soft text-zelli-accent' : 'text-zelli-muted'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {items === null && (
            <p className="py-10 text-center text-sm text-zelli-muted">Loading your shortlist…</p>
          )}

          {items !== null && error && (
            <p role="status" className="py-10 text-center text-sm text-zelli-primary">
              {error}
            </p>
          )}

          {items !== null && !error && items.length === 0 && (
            <EmptyState title={copy.emptyTitle} body={copy.emptyBody} />
          )}

          {items !== null && !error && items.length > 0 && (
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.view.id}>
                  <ShortlistCard
                    view={item.view}
                    variant={tab}
                    metaLabel={
                      tab === 'saved'
                        ? `Saved ${formatRelativeDay(item.viewedAt)}`
                        : `Maybe · ${formatRelativeDay(item.viewedAt)}`
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ZelliBottomNav active="shortlist" />
    </main>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zelli-accent-soft text-4xl text-zelli-accent">
        <span aria-hidden>♡</span>
      </div>
      <h2 className="mt-6 text-lg font-bold text-zelli-ink">{title}</h2>
      <p className="mt-2 max-w-[280px] text-sm text-zelli-muted">{body}</p>
      <Link
        href="/listings"
        className="mt-6 flex h-[52px] w-full max-w-[320px] items-center justify-center rounded-zelli-btn bg-zelli-primary text-base font-bold text-white transition-colors hover:bg-zelli-primary-hover"
      >
        Browse homes
      </Link>
    </div>
  );
}
