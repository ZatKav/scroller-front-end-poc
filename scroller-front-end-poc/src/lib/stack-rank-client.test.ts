import { fetchStackRankImages } from '@/lib/stack-rank-client';

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
      json: () => Promise.resolve(mockImages),
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
      json: () => Promise.resolve(mockImages),
    } as Response);

    await fetchStackRankImages({ skip: 4, limit: 2 });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://interactions.local/api/images/stack-rank?limit=2&skip=4',
      expect.any(Object),
    );
  });
});
