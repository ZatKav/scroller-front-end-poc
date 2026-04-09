import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { fetchStackRankImages, StackRankClientError } from '@/lib/stack-rank-client';
import { getStackRank, setStackRank } from '@/lib/stack-rank-session';
import type { StackRankImage } from '@/types/scroller-customer-interactions-db';

export const dynamic = 'force-dynamic';

function appendUniqueImages(
  existingImages: StackRankImage[],
  windowImages: StackRankImage[],
): StackRankImage[] {
  const seenImageIds = new Set(existingImages.map((image) => image.id));
  const newImages = windowImages.filter((image) => {
    if (seenImageIds.has(image.id)) {
      return false;
    }
    seenImageIds.add(image.id);
    return true;
  });
  return [...existingImages, ...newImages];
}

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
    const skip = readWindowNumber(request.nextUrl.searchParams, 'skip', 0, 0);
    const limit = readWindowNumber(request.nextUrl.searchParams, 'limit', 10, 1);
    const existingImages = getStackRank(user.id) ?? [];
    if (existingImages.length >= skip + limit) {
      return NextResponse.json({ ok: true, images: existingImages.slice(skip, skip + limit) });
    }

    const images = await fetchStackRankImages({ skip, limit });
    const filteredImages = images.filter((img) => img.image_data !== null);
    if (skip > existingImages.length) {
      return NextResponse.json({ ok: true, images: filteredImages.slice(0, limit) });
    }

    const mergedImages = appendUniqueImages(existingImages, filteredImages);
    setStackRank(user.id, mergedImages);
    return NextResponse.json({ ok: true, images: mergedImages.slice(skip, skip + limit) });
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
