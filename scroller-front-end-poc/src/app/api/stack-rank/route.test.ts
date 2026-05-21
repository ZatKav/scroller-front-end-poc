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
    it('fetches stack-rank images, filters null image_data, and returns images', async () => {
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
      expect(mockFetchStackRankImages).toHaveBeenCalledWith({
        customerId: MOCK_USER.id,
        skip: 0,
        limit: 10,
        consumed: 0,
      });
    });

    it('fetches and slices the requested customer-owned window', async () => {
      const upstreamImages = [
        { id: 1, image_data: 'data:image/png;base64,AAA=', image_summary: 'A property' },
        { id: 2, image_data: 'data:image/png;base64,BBB=', image_summary: 'B property' },
        { id: 3, image_data: null, image_summary: 'C property' },
        { id: 4, image_data: 'data:image/png;base64,DDD=', image_summary: null },
      ];
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchStackRankImages.mockResolvedValueOnce(upstreamImages);

      const response = await GET(makeRequest('valid-token', '?skip=1&limit=3'));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        ok: true,
        images: [
          { id: 2, image_data: 'data:image/png;base64,BBB=', image_summary: 'B property' },
          { id: 4, image_data: 'data:image/png;base64,DDD=', image_summary: null },
        ],
      });
      expect(mockFetchStackRankImages).toHaveBeenCalledWith({
        customerId: MOCK_USER.id,
        skip: 1,
        limit: 3,
        consumed: 0,
      });
    });

    it('only returns the requested window from an over-fetched upstream prefix', async () => {
      const upstreamImages = [
        { id: 1, image_data: 'data:image/png;base64,AAA=', image_summary: 'A property' },
        { id: 2, image_data: 'data:image/png;base64,BBB=', image_summary: 'B property' },
        { id: 3, image_data: 'data:image/png;base64,CCC=', image_summary: 'C property' },
      ];
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchStackRankImages.mockResolvedValueOnce(upstreamImages);

      const response = await GET(makeRequest('valid-token', '?skip=0&limit=1'));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ ok: true, images: [upstreamImages[0]] });
    });

    it('uses consumed count to slice only the new refill window', async () => {
      const upstreamImages = [
        { id: 2, image_data: 'data:image/png;base64,BBB=', image_summary: 'B property' },
        { id: 3, image_data: 'data:image/png;base64,CCC=', image_summary: 'C property' },
        { id: 4, image_data: 'data:image/png;base64,DDD=', image_summary: 'D property' },
        { id: 5, image_data: 'data:image/png;base64,EEE=', image_summary: 'E property' },
        { id: 6, image_data: 'data:image/png;base64,FFF=', image_summary: 'F property' },
      ];
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchStackRankImages.mockResolvedValueOnce(upstreamImages);

      const response = await GET(makeRequest('valid-token', '?skip=4&limit=2&consumed=1'));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ ok: true, images: upstreamImages.slice(3, 5) });
      expect(mockFetchStackRankImages).toHaveBeenCalledWith({
        customerId: MOCK_USER.id,
        skip: 4,
        limit: 2,
        consumed: 1,
      });
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
