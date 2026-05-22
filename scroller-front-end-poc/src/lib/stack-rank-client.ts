import type { StackRankImage } from '@/types/scroller-customer-interactions-db';

export interface StackRankWindowOptions {
  customerId?: number;
  skip?: number;
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

export async function fetchStackRankImages({
  customerId,
  skip = 0,
  limit = 10,
}: StackRankWindowOptions = {}): Promise<StackRankImage[]> {
  const baseUrl =
    process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL ?? 'http://localhost:8400';
  const apiKey = process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY;
  const query = new URLSearchParams({ limit: String(limit) });
  if (customerId !== undefined) {
    query.set('customer_id', String(customerId));
  } else {
    query.set('skip', String(skip));
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

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

  return (await response.json()) as StackRankImage[];
}
