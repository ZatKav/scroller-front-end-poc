import { EnrichmentDbConfigError, fetchListingDetail } from '@/lib/enrichment-db-client';

const mockFetch = jest.fn();
const originalBaseUrl = process.env.ENRICHMENT_DB_BASE_URL;
const originalApiKey = process.env.ENRICHMENT_DB_API_KEY;

beforeEach(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockReset();
  process.env.ENRICHMENT_DB_BASE_URL = 'http://enrichment.local';
  process.env.ENRICHMENT_DB_API_KEY = 'test-api-key';
});

afterEach(() => {
  if (originalBaseUrl === undefined) {
    delete process.env.ENRICHMENT_DB_BASE_URL;
  } else {
    process.env.ENRICHMENT_DB_BASE_URL = originalBaseUrl;
  }

  if (originalApiKey === undefined) {
    delete process.env.ENRICHMENT_DB_API_KEY;
  } else {
    process.env.ENRICHMENT_DB_API_KEY = originalApiKey;
  }
});

describe('fetchListingDetail', () => {
  it('requests the listing with a server-side bearer key and no caching', async () => {
    const listing = { id: 123, price: 450000 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(listing),
    } as Response);

    const result = await fetchListingDetail(123);

    expect(mockFetch).toHaveBeenCalledWith('http://enrichment.local/api/listings/123/detail', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-api-key',
      },
      cache: 'no-store',
    });
    expect(result).toEqual(listing);
  });

  it('throws an EnrichmentDbClientError carrying the status on an upstream 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response);

    await expect(fetchListingDetail(123)).rejects.toMatchObject({
      name: 'EnrichmentDbClientError',
      status: 404,
    });
  });

  it('throws an EnrichmentDbClientError carrying the status on an upstream 5xx', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 } as Response);

    await expect(fetchListingDetail(123)).rejects.toMatchObject({
      name: 'EnrichmentDbClientError',
      status: 503,
    });
  });

  it('wraps a network error as a status-0 EnrichmentDbClientError', async () => {
    mockFetch.mockRejectedValueOnce(new Error('connection refused'));

    await expect(fetchListingDetail(123)).rejects.toMatchObject({
      name: 'EnrichmentDbClientError',
      status: 0,
    });
  });

  it('throws a config error and makes no request when no api key is configured', async () => {
    delete process.env.ENRICHMENT_DB_API_KEY;

    await expect(fetchListingDetail(1)).rejects.toBeInstanceOf(EnrichmentDbConfigError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('falls back to the default base url when none is configured', async () => {
    delete process.env.ENRICHMENT_DB_BASE_URL;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 5 }),
    } as Response);

    await fetchListingDetail(5);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8200/api/listings/5/detail',
      expect.any(Object),
    );
  });
});
