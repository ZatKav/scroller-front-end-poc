import { notFound } from 'next/navigation';
import {
  EnrichmentDbClientError,
  fetchListingDetail,
} from '@/lib/enrichment-db-client';
import { mapListingToView } from '@/lib/listing-detail-view';
import ListingDetailContent from '@/components/ListingDetailContent';

interface ListingPageProps {
  params: Promise<{
    id: string;
  }>;
}

function parseListingId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const listingId = Number(value);
  return Number.isSafeInteger(listingId) ? listingId : null;
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const listingId = parseListingId(id);

  if (listingId === null) {
    notFound();
  }

  // Server-side render from the enrichment-db detail payload via the same
  // server-only client the BFF route uses. The (protected) layout already
  // enforces the session, so this calls the data source directly rather than
  // re-fetching the app's own /api/listings/[id] route over HTTP.
  try {
    const listing = await fetchListingDetail(listingId);
    return <ListingDetailContent view={mapListingToView(listing)} />;
  } catch (error) {
    // A missing listing is a 404 page; any other failure (upstream/network/
    // misconfig) bubbles to the route's error boundary.
    if (error instanceof EnrichmentDbClientError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
