/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/stack-rank-client', () => {
  const actual = jest.requireActual('@/lib/stack-rank-client');
  return {
    ...actual,
    fetchStackRankImages: jest.fn(),
  };
});

jest.mock('@/lib/stack-rank-session', () => ({
  setStackRank: jest.fn(),
  getStackRank: jest.fn(),
}));

import { verifyToken } from '@/lib/auth';
import { fetchStackRankImages, StackRankClientError } from '@/lib/stack-rank-client';
import { setStackRank } from '@/lib/stack-rank-session';
import { GET } from './route';

const mockVerifyToken = verifyToken as jest.Mock;
const mockFetchStackRankImages = fetchStackRankImages as jest.Mock;
const mockSetStackRank = setStackRank as jest.Mock;

const MOCK_USER = { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' };

function makeRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Cookie'] = `auth-token=${token}`;
  }
  return new NextRequest('http://localhost:3000/api/stack-rank', { headers });
}

beforeEach(() => {
  mockVerifyToken.mockReset();
  mockFetchStackRankImages.mockReset();
  mockSetStackRank.mockReset();
});

describe('GET /api/stack-rank', () => {
  describe('authentication', () => {
    it('returns 401 when no auth-token cookie is present', async () => {
      const response = await GET(makeRequest());
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('returns 401 when the token is invalid', async () => {
      mockVerifyToken.mockReturnValueOnce(null);
      const response = await GET(makeRequest('invalid-token'));
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('success', () => {
    it('fetches stack-rank images, filters null image_data, stores in session, and returns images', async () => {
      const mockImages = [
        { id: 1, image_data: 'data:image/png;base64,AAA=', image_summary: 'A property' },
        { id: 2, image_data: null, image_summary: null },
      ];
      const expectedFiltered = [
        { id: 1, image_data: 'data:image/png;base64,AAA=', image_summary: 'A property' },
      ];
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchStackRankImages.mockResolvedValueOnce(mockImages);

      const response = await GET(makeRequest('valid-token'));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ ok: true, images: expectedFiltered });
      expect(mockSetStackRank).toHaveBeenCalledWith(MOCK_USER.id, expectedFiltered);
    });
  });

  describe('upstream failure', () => {
    it('returns 502 and does not update session when upstream returns an error', async () => {
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchStackRankImages.mockRejectedValueOnce(
        new StackRankClientError('Stack-rank upstream returned 502', 502),
      );

      const response = await GET(makeRequest('valid-token'));

      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Stack-rank data could not be retrieved from the upstream service.',
      });
      expect(mockSetStackRank).not.toHaveBeenCalled();
    });

    it('returns 502 and does not update session when there is a network error', async () => {
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchStackRankImages.mockRejectedValueOnce(
        new StackRankClientError('Network error fetching stack-rank: connection refused', 0),
      );

      const response = await GET(makeRequest('valid-token'));

      expect(response.status).toBe(502);
      expect(mockSetStackRank).not.toHaveBeenCalled();
    });
  });
});
