import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { clearStackRank } from '@/lib/stack-rank-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (token) {
    const user = verifyToken(token);
    if (user) {
      clearStackRank(user.id);
    }
  }

  const response = NextResponse.json({ message: 'Logged out successfully' });

  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });

  return response;
}
