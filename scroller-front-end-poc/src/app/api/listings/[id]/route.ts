import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { EnrichmentDbClientError, fetchListingDetail } from '@/lib/enrichment-db-client';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseListingId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const listingId = Number(value);
  return Number.isSafeInteger(listingId) ? listingId : null;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  // Verify the app session locally before doing any upstream work — follow the
  // /api/stack-rank pattern, NOT the generic interactions-db proxy that forwards
  // the upstream key with no local auth check.
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const listingId = parseListingId(id);
  if (listingId === null) {
    return NextResponse.json({ error: 'Invalid listing id' }, { status: 400 });
  }

  try {
    const listing = await fetchListingDetail(listingId);
    return NextResponse.json(listing);
  } catch (error) {
    if (error instanceof EnrichmentDbClientError) {
      if (error.status === 404) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      }
      // Log the upstream detail server-side; never echo it (or the API key) to
      // the browser.
      console.error('Enrichment-db upstream error:', error.message);
      return NextResponse.json(
        { error: 'Listing could not be retrieved from the upstream service.' },
        { status: 502 },
      );
    }
    console.error('Unexpected listing detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
