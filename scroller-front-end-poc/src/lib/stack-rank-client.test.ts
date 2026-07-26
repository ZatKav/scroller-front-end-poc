import {
  fetchListingStackRank,
  fetchStackRank,
  fetchStackRankImages,
} from '@/lib/stack-rank-client';

const mockFetch = jest.fn();
const originalBaseUrl = process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL;
const originalApiKey = process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY;

beforeEach(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockReset();
  process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL = 'http://interactions.local';
  process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY = 'test-api-key';
});

afterEach(() => {
  if (originalBaseUrl === undefined) {
    delete process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL;
  } else {
    process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL = originalBaseUrl;
  }

  if (originalApiKey === undefined) {
    delete process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY;
  } else {
    process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY = originalApiKey;
  }
});

describe('fetchStackRankImages', () => {
  it('requests the customer-aware stack-rank continuation window from the interactions API', async () => {
    const mockImages = [
      { id: 2, image_data: 'data:image/png;base64,BBB=', image_summary: 'B property' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ images: mockImages, profile_weights: {} }),
    } as Response);

    const result = await fetchStackRankImages({
      customerId: 42,
      customerCredential: 'customer-token',
      limit: 3,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://interactions.local/api/images/stack-rank?limit=3&customer_id=42',
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-api-key',
          'X-Scroller-Customer-Authorization': 'Bearer customer-token',
        },
        cache: 'no-store',
      },
    );
    expect(result).toEqual(mockImages);
  });

});

describe('fetchStackRank', () => {
  it('returns the images and per-customer profile weights from the envelope', async () => {
    const mockImages = [
      {
        id: 2,
        image_data: 'data:image/png;base64,BBB=',
        image_summary: 'B property',
        final_score: 0.42,
        selection_reason: 'exploit',
      },
    ];
    const mockWeights = { 'decor_style:modern': 1.0, 'material:quartz': 0.5 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ images: mockImages, profile_weights: mockWeights }),
    } as Response);

    const result = await fetchStackRank({ customerId: 42, customerCredential: 'token', limit: 3 });

    expect(result).toEqual({ images: mockImages, profile_weights: mockWeights });
  });

  it('defaults to empty images and weights when the upstream omits them', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await fetchStackRank({ customerId: 42, customerCredential: 'token' });

    expect(result).toEqual({ images: [], profile_weights: {} });
  });

  it('tolerates a legacy bare-list backend response with no envelope', async () => {
    const mockImages = [
      { id: 1, image_data: 'data:image/png;base64,AAA=', image_summary: 'A property' },
      { id: 2, image_data: 'data:image/png;base64,BBB=', image_summary: 'B property' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockImages),
    } as Response);

    const result = await fetchStackRank({ customerId: 42, customerCredential: 'token', limit: 3 });

    expect(result).toEqual({ images: mockImages, profile_weights: {} });
  });
});

describe('fetchListingStackRank', () => {
  it('requests the customer-aware listing stack-rank window from the interactions API', async () => {
    const mockListings = [{ id: 101, title: 'First listing' }];
    const mockWeights = { 'bedrooms:3': 0.8 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: mockListings, profile_weights: mockWeights }),
    } as Response);

    const result = await fetchListingStackRank({
      customerId: 42,
      customerCredential: 'customer-token',
      limit: 4,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://interactions.local/api/listings/stack-rank?limit=4&customer_id=42',
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-api-key',
          'X-Scroller-Customer-Authorization': 'Bearer customer-token',
        },
        cache: 'no-store',
      },
    );
    expect(result).toEqual({ listings: mockListings, profile_weights: mockWeights });
  });

  it('defaults to an empty listing response when the upstream omits fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    await expect(fetchListingStackRank({ customerId: 42, customerCredential: 'token' })).resolves.toEqual({
      listings: [],
      profile_weights: {},
    });
  });
});
