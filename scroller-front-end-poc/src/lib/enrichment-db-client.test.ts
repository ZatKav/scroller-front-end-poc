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
    expect(result).toMatchObject({ id: 123, price: 450000 });
  });

  it('strips image bytes and analysis blobs before returning', async () => {
    // The upstream payload inlines every image as base64 plus a large analysis
    // blob. None of it is rendered, and a six-listing window measured ~50MB, so
    // it must not reach the browser. Images are addressed by content_hash and
    // fetched from /media instead.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 7,
          title: 'A house',
          description_analysis: 'x'.repeat(5000),
          images: [
            {
              id: 1,
              content_hash: 'a'.repeat(64),
              image_data: 'BASE64PAYLOAD'.repeat(1000),
              image_analysis: 'y'.repeat(5000),
              url: 'https://harvest-source.example/photo.jpg',
              alt_text: 'Front',
              position: 0,
              is_primary: true,
              width: 1621,
              height: 1080,
            },
          ],
        }),
    } as Response);

    const result = await fetchListingDetail(7);
    const serialised = JSON.stringify(result);

    expect(serialised).not.toContain('BASE64PAYLOAD');
    expect(serialised).not.toContain('image_analysis');
    expect(serialised).not.toContain('description_analysis');
    // The harvest-source URL is a pointer we do not expose to the browser.
    expect(serialised).not.toContain('harvest-source.example');

    expect(result.images).toEqual([
      {
        id: 1,
        content_hash: 'a'.repeat(64),
        alt_text: 'Front',
        position: 0,
        is_primary: true,
        width: 1621,
        height: 1080,
      },
    ]);
  });

  it('drops images that have no content_hash, since they cannot be addressed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 8,
          images: [
            { id: 1, content_hash: 'b'.repeat(64), is_primary: true },
            { id: 2, content_hash: null, is_primary: false },
          ],
        }),
    } as Response);

    const result = await fetchListingDetail(8);

    expect(result.images).toHaveLength(1);
    expect(result.images[0].id).toBe(1);
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
