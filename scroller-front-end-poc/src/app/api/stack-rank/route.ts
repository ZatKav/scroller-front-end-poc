import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { fetchStackRankImages, StackRankClientError } from '@/lib/stack-rank-client';
import { setStackRank } from '@/lib/stack-rank-session';

export const dynamic = 'force-dynamic';

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
    const images = await fetchStackRankImages();
    const filteredImages = images.filter((img) => img.image_data !== null);
    setStackRank(user.id, filteredImages);
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
