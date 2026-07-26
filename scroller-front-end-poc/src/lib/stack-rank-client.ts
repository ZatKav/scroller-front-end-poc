import type {
  ListingStackRankResponse,
  StackRankImage,
  StackRankProfileWeights,
  StackRankResponse,
} from '@/types/scroller-customer-interactions-db';

export interface StackRankWindowOptions {
  customerId: number;
  customerCredential: string;
  limit?: number;
}

export class StackRankClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'StackRankClientError';
  }
}

export async function fetchStackRank({
  customerId,
  customerCredential,
  limit = 10,
}: StackRankWindowOptions): Promise<StackRankResponse> {
  const baseUrl =
    process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL ?? 'http://localhost:8400';
  const apiKey = process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY;
  const query = new URLSearchParams({
    limit: String(limit),
    customer_id: String(customerId),
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  headers['X-Scroller-Customer-Authorization'] = `Bearer ${customerCredential}`;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/images/stack-rank?${query.toString()}`, {
      headers,
      cache: 'no-store',
    });
  } catch (error) {
    throw new StackRankClientError(
      `Network error fetching stack-rank: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0,
    );
  }

  if (!response.ok) {
    throw new StackRankClientError(
      `Stack-rank upstream returned ${response.status}`,
      response.status,
    );
  }

  const payload = (await response.json()) as
    | StackRankImage[]
    | Partial<StackRankResponse>;

  // Tolerate both response shapes so the front end works regardless of which
  // backend version is deployed: the legacy endpoint returns a bare list of
  // cards, while the current endpoint returns a { images, profile_weights }
  // envelope. A bare list carries no weights, so default them to {}.
  if (Array.isArray(payload)) {
    return { images: payload, profile_weights: {} };
  }

  return {
    images: payload.images ?? [],
    profile_weights: (payload.profile_weights ?? {}) as StackRankProfileWeights,
  };
}

export async function fetchStackRankImages(
  options: StackRankWindowOptions,
): Promise<StackRankImage[]> {
  return (await fetchStackRank(options)).images;
}

export async function fetchListingStackRank({
  customerId,
  customerCredential,
  limit = 4,
}: StackRankWindowOptions): Promise<ListingStackRankResponse> {
  const baseUrl =
    process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL ?? 'http://localhost:8400';
  const apiKey = process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY;
  const query = new URLSearchParams({
    limit: String(limit),
    customer_id: String(customerId),
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  headers['X-Scroller-Customer-Authorization'] = `Bearer ${customerCredential}`;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/listings/stack-rank?${query.toString()}`, {
      headers,
      cache: 'no-store',
    });
  } catch (error) {
    throw new StackRankClientError(
      `Network error fetching listing stack-rank: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0,
    );
  }

  if (!response.ok) {
    throw new StackRankClientError(
      `Listing stack-rank upstream returned ${response.status}`,
      response.status,
    );
  }

  const payload = (await response.json()) as Partial<ListingStackRankResponse>;

  return {
    listings: payload.listings ?? [],
    profile_weights: (payload.profile_weights ?? {}) as StackRankProfileWeights,
  };
}
