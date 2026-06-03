import { fetchStackRank, fetchStackRankImages } from '@/lib/stack-rank-client';

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

    const result = await fetchStackRankImages({ customerId: 42, limit: 3 });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://interactions.local/api/images/stack-rank?limit=3&customer_id=42',
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-api-key',
        },
        cache: 'no-store',
      },
    );
    expect(result).toEqual(mockImages);
  });

  it('falls back to legacy skip/limit windows when no customer id is provided', async () => {
    const mockImages = [
      { id: 7, image_data: 'data:image/png;base64,GGG=', image_summary: 'G property' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ images: mockImages, profile_weights: {} }),
    } as Response);

    await fetchStackRankImages({ skip: 4, limit: 2 });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://interactions.local/api/images/stack-rank?limit=2&skip=4',
      expect.any(Object),
    );
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

    const result = await fetchStackRank({ customerId: 42, limit: 3 });

    expect(result).toEqual({ images: mockImages, profile_weights: mockWeights });
  });

  it('defaults to empty images and weights when the upstream omits them', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await fetchStackRank({ customerId: 42 });

    expect(result).toEqual({ images: [], profile_weights: {} });
  });
});
