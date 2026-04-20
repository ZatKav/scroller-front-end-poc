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

import { verifyToken } from '@/lib/auth';
import { fetchStackRankImages, StackRankClientError } from '@/lib/stack-rank-client';
import { GET } from './route';

const mockVerifyToken = verifyToken as jest.Mock;
const mockFetchStackRankImages = fetchStackRankImages as jest.Mock;

const MOCK_USER = { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' };

function makeRequest(token?: string, query = ''): NextRequest {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Cookie'] = `auth-token=${token}`;
  }
  return new NextRequest(`http://localhost:8410/api/stack-rank${query}`, { headers });
}

beforeEach(() => {
  mockVerifyToken.mockReset();
  mockFetchStackRankImages.mockReset();
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
    it('requests customer-aware images using authenticated user id and default limit', async () => {
      const mockImages = [
        { id: 1, image_data: 'data:image/png;base64,AAA=', image_summary: 'A property' },
        { id: 2, image_data: null, image_summary: 'Hidden card' },
      ];
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchStackRankImages.mockResolvedValueOnce(mockImages);

      const response = await GET(makeRequest('valid-token'));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        ok: true,
        images: [{ id: 1, image_data: 'data:image/png;base64,AAA=', image_summary: 'A property' }],
      });
      expect(mockFetchStackRankImages).toHaveBeenCalledWith({ customerId: MOCK_USER.id, limit: 10 });
    });

    it('uses requested limit and ignores legacy skip windows', async () => {
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchStackRankImages.mockResolvedValueOnce([]);

      const response = await GET(makeRequest('valid-token', '?skip=100&limit=3'));

      expect(response.status).toBe(200);
      expect(mockFetchStackRankImages).toHaveBeenCalledWith({ customerId: MOCK_USER.id, limit: 3 });
    });

    it('normalizes non-integer or out-of-range limits', async () => {
      mockVerifyToken.mockReturnValue(MOCK_USER);
      mockFetchStackRankImages.mockResolvedValue([]);

      await GET(makeRequest('valid-token', '?limit=-2'));
      await GET(makeRequest('valid-token', '?limit=2.9'));
      await GET(makeRequest('valid-token', '?limit=not-a-number'));

      expect(mockFetchStackRankImages).toHaveBeenNthCalledWith(1, { customerId: MOCK_USER.id, limit: 1 });
      expect(mockFetchStackRankImages).toHaveBeenNthCalledWith(2, { customerId: MOCK_USER.id, limit: 2 });
      expect(mockFetchStackRankImages).toHaveBeenNthCalledWith(3, { customerId: MOCK_USER.id, limit: 10 });
    });
  });

  describe('upstream failure', () => {
    it('returns 502 when upstream returns an error', async () => {
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
    });

    it('returns 502 when there is a network error', async () => {
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchStackRankImages.mockRejectedValueOnce(
        new StackRankClientError('Network error fetching stack-rank: connection refused', 0),
      );

      const response = await GET(makeRequest('valid-token'));

      expect(response.status).toBe(502);
    });
  });
});
