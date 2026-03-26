/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/stack-rank-session', () => ({
  clearStackRank: jest.fn(),
}));

import { verifyToken } from '@/lib/auth';
import { clearStackRank } from '@/lib/stack-rank-session';
import { POST } from './route';

const mockVerifyToken = verifyToken as jest.Mock;
const mockClearStackRank = clearStackRank as jest.Mock;

function makeRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Cookie = `auth-token=${token}`;
  }

  return new NextRequest('http://localhost:8410/api/auth/logout', { headers });
}

beforeEach(() => {
  mockVerifyToken.mockReset();
  mockClearStackRank.mockReset();
});

describe('POST /api/auth/logout', () => {
  it('clears stack-rank session data for the authenticated user before clearing the cookie', async () => {
    mockVerifyToken.mockReturnValueOnce({
      id: 7,
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
    });

    const response = await POST(makeRequest('valid-token'));

    expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
    expect(mockClearStackRank).toHaveBeenCalledWith(7);
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('auth-token=');
  });

  it('still clears the auth cookie when there is no valid authenticated user', async () => {
    mockVerifyToken.mockReturnValueOnce(null);

    const response = await POST(makeRequest('invalid-token'));

    expect(mockClearStackRank).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
