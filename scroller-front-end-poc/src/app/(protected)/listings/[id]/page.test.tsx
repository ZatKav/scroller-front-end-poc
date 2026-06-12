import { render, screen } from '@testing-library/react';
import ListingFlowPage from './page';
import { EnrichmentDbClientError } from '@/lib/enrichment-db-client';
import type { ListingDetail } from '@/types/enrichment-db';

const mockNotFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

const mockFetchListingDetail = jest.fn();

jest.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
}));

jest.mock('@/components/ListingFlow', () => function MockListingFlow({
  initialListing,
}: {
  initialListing: ListingDetail;
}) {
  return <div>Listing flow for {initialListing.id}</div>;
});

jest.mock('@/lib/enrichment-db-client', () => {
  const actual = jest.requireActual('@/lib/enrichment-db-client');
  return {
    ...actual,
    fetchListingDetail: (listingId: number) => mockFetchListingDetail(listingId),
  };
});

const listing: ListingDetail = {
  id: 123,
  title: 'Riverside Apartment',
  first_seen: new Date().toISOString(),
  images: [{ id: 1, image_data: 'AAAA', is_primary: true, position: 0 }],
};

describe('listing flow detail page', () => {
  beforeEach(() => {
    mockNotFound.mockClear();
    mockFetchListingDetail.mockReset();
  });

  it('renders the listing flow with the direct-navigation listing', async () => {
    mockFetchListingDetail.mockResolvedValueOnce(listing);

    const result = await ListingFlowPage({ params: Promise.resolve({ id: '123' }) });
    render(result);

    expect(mockFetchListingDetail).toHaveBeenCalledWith(123);
    expect(screen.getByText('Listing flow for 123')).toBeTruthy();
  });

  it.each(['not-a-number', '0', '-1', '1.5', '99999999999999999999'])(
    'renders not-found for malformed id %s without calling upstream',
    async (id) => {
      await expect(
        ListingFlowPage({ params: Promise.resolve({ id }) }),
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalledTimes(1);
      expect(mockFetchListingDetail).not.toHaveBeenCalled();
    },
  );

  it('renders not-found when the listing does not exist', async () => {
    mockFetchListingDetail.mockRejectedValueOnce(
      new EnrichmentDbClientError('not found', 404),
    );

    await expect(
      ListingFlowPage({ params: Promise.resolve({ id: '123' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('rethrows non-404 upstream errors to the error boundary', async () => {
    mockFetchListingDetail.mockRejectedValueOnce(
      new EnrichmentDbClientError('upstream down', 502),
    );

    await expect(
      ListingFlowPage({ params: Promise.resolve({ id: '123' }) }),
    ).rejects.toThrow('upstream down');
  });
});
