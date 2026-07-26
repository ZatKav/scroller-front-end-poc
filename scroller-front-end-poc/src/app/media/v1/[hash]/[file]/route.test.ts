/**
 * @jest-environment node
 */
import { GET } from './route';
import {
  EnrichmentDbClientError,
  EnrichmentDbConfigError,
  fetchImageVariant,
} from '@/lib/enrichment-db-client';

jest.mock('@/lib/enrichment-db-client', () => {
  const actual = jest.requireActual('@/lib/enrichment-db-client');
  return { ...actual, fetchImageVariant: jest.fn() };
});

const mockFetchImageVariant = fetchImageVariant as jest.MockedFunction<
  typeof fetchImageVariant
>;

const VALID_HASH = 'a'.repeat(64);

function requestFor(headers: Record<string, string> = {}) {
  return new Request('http://localhost/media/v1/x/card.webp', {
    headers,
  }) as unknown as Parameters<typeof GET>[0];
}

function paramsFor(hash: string, file: string) {
  return { params: Promise.resolve({ hash, file }) };
}

function pngBytes(): ArrayBuffer {
  return new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x01, 0x02]).buffer;
}

beforeEach(() => {
  mockFetchImageVariant.mockReset();
});

describe('GET /media/v1/[hash]/[file]', () => {
  it('serves image bytes with an immutable cache policy', async () => {
    mockFetchImageVariant.mockResolvedValue({
      body: pngBytes(),
      contentType: 'image/webp',
      etag: '"abc-card"',
    });

    const response = await GET(requestFor(), paramsFor(VALID_HASH, 'card.webp'));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    // The whole point of content-addressing: these bytes can never change.
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(response.headers.get('etag')).toBe('"abc-card"');
    expect(await response.arrayBuffer()).toEqual(pngBytes());
  });

  it.each(['thumb', 'card', 'full'])('serves the %s variant', async (variant) => {
    mockFetchImageVariant.mockResolvedValue({
      body: pngBytes(),
      contentType: 'image/webp',
      etag: null,
    });

    const response = await GET(
      requestFor(),
      paramsFor(VALID_HASH, `${variant}.webp`),
    );

    expect(response.status).toBe(200);
    expect(mockFetchImageVariant).toHaveBeenCalledWith(VALID_HASH, variant, null);
  });

  it('returns 304 when the caller already has the bytes', async () => {
    mockFetchImageVariant.mockResolvedValue({
      body: new ArrayBuffer(0),
      contentType: 'image/webp',
      etag: '"abc-card"',
    });

    const response = await GET(
      requestFor({ 'if-none-match': '"abc-card"' }),
      paramsFor(VALID_HASH, 'card.webp'),
    );

    expect(response.status).toBe(304);
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
  });

  it('forwards If-None-Match upstream so revalidation is cheap', async () => {
    mockFetchImageVariant.mockResolvedValue({
      body: new ArrayBuffer(0),
      contentType: 'image/webp',
      etag: '"abc-card"',
    });

    await GET(
      requestFor({ 'if-none-match': '"abc-card"' }),
      paramsFor(VALID_HASH, 'card.webp'),
    );

    expect(mockFetchImageVariant).toHaveBeenCalledWith(
      VALID_HASH,
      'card',
      '"abc-card"',
    );
  });

  it('404s an unknown content hash', async () => {
    mockFetchImageVariant.mockResolvedValue(null);

    const response = await GET(requestFor(), paramsFor(VALID_HASH, 'card.webp'));

    expect(response.status).toBe(404);
  });

  it.each([
    ['too short', 'abc'],
    ['non-hex', 'g'.repeat(64)],
    ['uppercase', 'A'.repeat(64)],
    ['63 chars', 'a'.repeat(63)],
    ['65 chars', 'a'.repeat(65)],
  ])('404s a malformed hash (%s) without calling upstream', async (_label, hash) => {
    const response = await GET(requestFor(), paramsFor(hash, 'card.webp'));

    expect(response.status).toBe(404);
    expect(mockFetchImageVariant).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown variant', 'enormous.webp'],
    ['no extension', 'card'],
    ['wrong extension', 'card.png'],
    ['traversal attempt', '../card.webp'],
  ])('404s a bad filename (%s) without calling upstream', async (_label, file) => {
    const response = await GET(requestFor(), paramsFor(VALID_HASH, file));

    expect(response.status).toBe(404);
    expect(mockFetchImageVariant).not.toHaveBeenCalled();
  });

  it('maps an upstream failure to 502, not 500', async () => {
    mockFetchImageVariant.mockRejectedValue(
      new EnrichmentDbClientError('upstream exploded', 503),
    );

    const response = await GET(requestFor(), paramsFor(VALID_HASH, 'card.webp'));

    expect(response.status).toBe(502);
  });

  it('maps a missing API key to 500, since that is our misconfiguration', async () => {
    mockFetchImageVariant.mockRejectedValue(
      new EnrichmentDbConfigError('ENRICHMENT_DB_API_KEY is not configured'),
    );

    const response = await GET(requestFor(), paramsFor(VALID_HASH, 'card.webp'));

    expect(response.status).toBe(500);
  });
});
