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
    fetchListingStackRank: jest.fn(),
  };
});

import { verifyToken } from '@/lib/auth';
import { fetchListingStackRank, StackRankClientError } from '@/lib/stack-rank-client';
import { GET } from './route';

const mockVerifyToken = verifyToken as jest.Mock;
const mockFetchListingStackRank = fetchListingStackRank as jest.Mock;

const MOCK_USER = { id: 42, username: 'testuser', email: 'test@example.com', role: 'user' };

function makeRequest(token?: string, query = ''): NextRequest {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Cookie'] = `auth-token=${token}`;
  }
  return new NextRequest(`http://localhost:8410/api/listings/stack-rank${query}`, {
    headers,
  });
}

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  mockVerifyToken.mockReset();
  mockFetchListingStackRank.mockReset();
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('GET /api/listings/stack-rank', () => {
  it('returns 401 when no auth-token cookie is present and does not call upstream', async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(mockFetchListingStackRank).not.toHaveBeenCalled();
  });

  it('returns 401 when the token is invalid and does not call upstream', async () => {
    mockVerifyToken.mockReturnValueOnce(null);

    const response = await GET(makeRequest('invalid-token'));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(mockFetchListingStackRank).not.toHaveBeenCalled();
  });

  it('passes the signed-in customer id upstream with the default queue preload limit', async () => {
    const upstreamResponse = {
      listings: [{ id: 101, title: 'Ranked listing' }],
      profile_weights: { 'bedrooms:3': 1 },
    };
    mockVerifyToken.mockReturnValueOnce(MOCK_USER);
    mockFetchListingStackRank.mockResolvedValueOnce(upstreamResponse);

    const response = await GET(makeRequest('valid-token'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, ...upstreamResponse });
    expect(mockFetchListingStackRank).toHaveBeenCalledWith({ customerId: 42, limit: 4 });
  });

  it('honors a positive integer limit while keeping upstream credentials server-side', async () => {
    mockVerifyToken.mockReturnValueOnce(MOCK_USER);
    mockFetchListingStackRank.mockResolvedValueOnce({ listings: [], profile_weights: {} });

    await GET(makeRequest('valid-token', '?limit=7'));

    expect(mockFetchListingStackRank).toHaveBeenCalledWith({ customerId: 42, limit: 7 });
  });

  it('maps invalid limits to the default preload window', async () => {
    mockVerifyToken.mockReturnValueOnce(MOCK_USER);
    mockFetchListingStackRank.mockResolvedValueOnce({ listings: [], profile_weights: {} });

    await GET(makeRequest('valid-token', '?limit=not-a-number'));

    expect(mockFetchListingStackRank).toHaveBeenCalledWith({ customerId: 42, limit: 4 });
  });

  it('maps upstream failures to a stable bad-gateway response without leaking detail', async () => {
    mockVerifyToken.mockReturnValueOnce(MOCK_USER);
    mockFetchListingStackRank.mockRejectedValueOnce(
      new StackRankClientError('Listing stack-rank upstream returned 503', 503),
    );

    const response = await GET(makeRequest('valid-token'));

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body).toEqual({
      error: 'Listing stack-rank data could not be retrieved from the upstream service.',
    });
    expect(JSON.stringify(body)).not.toContain('503');
  });

  it('maps unexpected failures to 500', async () => {
    mockVerifyToken.mockReturnValueOnce(MOCK_USER);
    mockFetchListingStackRank.mockRejectedValueOnce(new Error('boom'));

    const response = await GET(makeRequest('valid-token'));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });
});
