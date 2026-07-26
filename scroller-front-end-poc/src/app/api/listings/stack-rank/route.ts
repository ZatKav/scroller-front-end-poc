import { NextRequest, NextResponse } from 'next/server';
import { generateCustomerCredential, verifyToken } from '@/lib/auth';
import { fetchListingStackRank, StackRankClientError } from '@/lib/stack-rank-client';

export const dynamic = 'force-dynamic';

const DEFAULT_LISTING_QUEUE_LIMIT = 4;

function readWindowNumber(
  searchParams: URLSearchParams,
  name: string,
  defaultValue: number,
  minimum: number,
): number {
  const rawValue = Number(searchParams.get(name) ?? defaultValue);
  if (!Number.isFinite(rawValue)) {
    return defaultValue;
  }
  return Math.max(minimum, Math.floor(rawValue));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limit = readWindowNumber(
      request.nextUrl.searchParams,
      'limit',
      DEFAULT_LISTING_QUEUE_LIMIT,
      1,
    );
    const { listings, profile_weights } = await fetchListingStackRank({
      customerId: user.id,
      customerCredential: generateCustomerCredential(user.id),
      limit,
    });

    return NextResponse.json({ ok: true, listings, profile_weights });
  } catch (error) {
    if (error instanceof StackRankClientError) {
      console.error('Listing stack-rank upstream error:', error.message);
      return NextResponse.json(
        { error: 'Listing stack-rank data could not be retrieved from the upstream service.' },
        { status: 502 },
      );
    }
    console.error('Unexpected listing stack-rank error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
