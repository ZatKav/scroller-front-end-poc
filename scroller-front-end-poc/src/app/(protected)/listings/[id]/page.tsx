import { notFound } from 'next/navigation';
import ListingFlow from '@/components/ListingFlow';
import {
  EnrichmentDbClientError,
  fetchListingDetail,
} from '@/lib/enrichment-db-client';

interface ListingFlowPageProps {
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

export default async function ListingFlowPage({ params }: ListingFlowPageProps) {
  const { id } = await params;
  const listingId = parseListingId(id);

  if (listingId === null) {
    notFound();
  }

  try {
    const listing = await fetchListingDetail(listingId);
    return <ListingFlow initialListing={listing} />;
  } catch (error) {
    if (error instanceof EnrichmentDbClientError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
