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
export async function fetchListingDetail(listingId: number): Promise<ListingDetail> {
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

  return (await response.json()) as ListingDetail;
}
