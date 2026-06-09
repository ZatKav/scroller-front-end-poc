import { render, screen } from '@testing-library/react';
import ListingPage from './page';
import { EnrichmentDbClientError } from '@/lib/enrichment-db-client';
import type { ListingDetail } from '@/types/enrichment-db';

const mockNotFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

jest.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
}));

const mockFetchListingDetail = jest.fn();

// Keep the real error classes (used with `instanceof`) and mock only the fetch.
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
  price: 450000,
  first_seen: new Date().toISOString(),
  images: [{ id: 1, image_data: 'AAAA', is_primary: true, position: 0 }],
};

describe('listing detail page', () => {
  beforeEach(() => {
    mockNotFound.mockClear();
    mockFetchListingDetail.mockReset();
  });

  it('renders the listing detail for a valid id', async () => {
    mockFetchListingDetail.mockResolvedValueOnce(listing);

    const result = await ListingPage({ params: Promise.resolve({ id: '123' }) });
    render(result);

    expect(mockFetchListingDetail).toHaveBeenCalledWith(123);
    expect(
      screen.getByRole('heading', { name: 'Riverside Apartment' }),
    ).toBeTruthy();
    expect(screen.getByTestId('listing-price').textContent).toBe('£450,000');
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it.each(['not-a-number', '0', '-1', '1.5', '99999999999999999999'])(
    'renders not-found for malformed id %s without calling upstream',
    async (id) => {
      await expect(
        ListingPage({ params: Promise.resolve({ id }) }),
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalledTimes(1);
      expect(mockFetchListingDetail).not.toHaveBeenCalled();
    },
  );

  it('renders not-found when the listing does not exist (upstream 404)', async () => {
    mockFetchListingDetail.mockRejectedValueOnce(
      new EnrichmentDbClientError('not found', 404),
    );

    await expect(
      ListingPage({ params: Promise.resolve({ id: '123' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-404 upstream errors to the error boundary', async () => {
    mockFetchListingDetail.mockRejectedValueOnce(
      new EnrichmentDbClientError('upstream down', 502),
    );

    await expect(
      ListingPage({ params: Promise.resolve({ id: '123' }) }),
    ).rejects.toThrow('upstream down');

    expect(mockNotFound).not.toHaveBeenCalled();
  });
});
