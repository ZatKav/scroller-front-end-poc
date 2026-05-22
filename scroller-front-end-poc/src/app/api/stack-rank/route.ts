import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { fetchStackRankImages, StackRankClientError } from '@/lib/stack-rank-client';

export const dynamic = 'force-dynamic';

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
    const limit = readWindowNumber(request.nextUrl.searchParams, 'limit', 10, 1);
    const images = await fetchStackRankImages({ customerId: user.id, limit });
    const filteredImages = images.filter((img) => img.image_data !== null);
    return NextResponse.json({ ok: true, images: filteredImages });
  } catch (error) {
    if (error instanceof StackRankClientError) {
      console.error('Stack-rank upstream error:', error.message);
      return NextResponse.json(
        { error: 'Stack-rank data could not be retrieved from the upstream service.' },
        { status: 502 },
      );
    }
    console.error('Unexpected stack-rank error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
