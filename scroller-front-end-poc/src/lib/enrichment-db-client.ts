import { slimListing, type SlimListing } from '@/lib/listing-payload';
import type { ListingDetail } from '@/types/enrichment-db';

export class EnrichmentDbClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'EnrichmentDbClientError';
  }
}

/**
 * Raised when the server is missing required enrichment-db configuration (e.g.
 * the API key). This is a deploy misconfiguration, not an upstream outage, so
 * the BFF route maps it to a 500 rather than a 502.
 */
export class EnrichmentDbConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnrichmentDbConfigError';
  }
}

/**
 * Server-side fetch wrapper for the enrichment-db listing detail endpoint.
 *
 * The upstream API key is read from the environment and injected as a Bearer
 * header here, on the server, so it is never exposed to the browser. A missing
 * key is a server misconfiguration and throws EnrichmentDbConfigError (mapped to
 * 500) before any request is made. Network failures surface as a status-0 error
 * and any non-2xx upstream response throws with the upstream status so the BFF
 * route can map it to a stable FE response.
 */
export async function fetchListingDetail(listingId: number): Promise<SlimListing> {
  const baseUrl = process.env.ENRICHMENT_DB_BASE_URL ?? 'http://localhost:8200';
  const apiKey = process.env.ENRICHMENT_DB_API_KEY;

  if (!apiKey) {
    throw new EnrichmentDbConfigError('ENRICHMENT_DB_API_KEY is not configured');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  let response: Response;
  try {
    // The /detail endpoint (EDB-2) returns the ListingDetail contract: images
    // ordered with is_primary/position and bounded payload size, which the
    // detail page needs. The plain /listings/{id} endpoint carries no ordering.
    response = await fetch(`${baseUrl}/api/listings/${listingId}/detail`, {
      headers,
      cache: 'no-store',
    });
  } catch (error) {
    throw new EnrichmentDbClientError(
      `Network error fetching listing ${listingId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0,
    );
  }

  if (!response.ok) {
    throw new EnrichmentDbClientError(
      `Enrichment-db upstream returned ${response.status}`,
      response.status,
    );
  }

  // Slim here rather than in each route so every consumer benefits, including
  // the server-rendered /listings/[id] page. That page previously embedded the
  // upstream payload into its RSC flight data, producing a 13.4MB HTML
  // document; the images are now fetched from /media instead.
  return slimListing((await response.json()) as ListingDetail);
}

/** The display sizes rendered at harvest time. Mirrors VARIANT_WIDTHS upstream. */
export const IMAGE_VARIANTS = ['thumb', 'card', 'full'] as const;
export type ImageVariant = (typeof IMAGE_VARIANTS)[number];

export interface ImageVariantResponse {
  body: ArrayBuffer;
  contentType: string;
  etag: string | null;
}

export function isImageVariant(value: string): value is ImageVariant {
  return (IMAGE_VARIANTS as readonly string[]).includes(value);
}

/**
 * Fetch one pre-rendered image variant as raw bytes.
 *
 * Unlike the listing endpoints this returns binary rather than base64-in-JSON,
 * which is the entire point: the bytes reach the browser at their real size,
 * cacheable as an ordinary image. The API key is injected here, server-side, so
 * the public /media URL never carries a credential.
 *
 * `ifNoneMatch` is forwarded so a revalidating browser gets a 304 straight from
 * upstream instead of us re-reading bytes we are about to discard.
 */
export async function fetchImageVariant(
  contentHash: string,
  variant: ImageVariant,
  ifNoneMatch?: string | null,
): Promise<ImageVariantResponse | null> {
  const baseUrl = process.env.ENRICHMENT_DB_BASE_URL ?? 'http://localhost:8200';
  const apiKey = process.env.ENRICHMENT_DB_API_KEY;

  if (!apiKey) {
    throw new EnrichmentDbConfigError('ENRICHMENT_DB_API_KEY is not configured');
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
  if (ifNoneMatch) {
    headers['If-None-Match'] = ifNoneMatch;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/image-variants/${contentHash}/${variant}`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    throw new EnrichmentDbClientError(
      `Network error fetching image variant ${variant}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0,
    );
  }

  // Upstream agreed the bytes are unchanged; pass that straight through.
  if (response.status === 304) {
    return {
      body: new ArrayBuffer(0),
      contentType: response.headers.get('content-type') ?? 'image/webp',
      etag: response.headers.get('etag'),
    };
  }

  // A hash with no matching row is a normal miss, not an outage.
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new EnrichmentDbClientError(
      `Enrichment-db upstream returned ${response.status}`,
      response.status,
    );
  }

  return {
    body: await response.arrayBuffer(),
    contentType: response.headers.get('content-type') ?? 'image/webp',
    etag: response.headers.get('etag'),
  };
}
