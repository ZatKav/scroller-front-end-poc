/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn(),
}));

jest.mock('@/lib/enrichment-db-client', () => {
  const actual = jest.requireActual('@/lib/enrichment-db-client');
  return {
    ...actual,
    fetchListingDetail: jest.fn(),
  };
});

import { verifyToken } from '@/lib/auth';
import {
  EnrichmentDbClientError,
  EnrichmentDbConfigError,
  fetchListingDetail,
} from '@/lib/enrichment-db-client';
import { GET } from './route';

const mockVerifyToken = verifyToken as jest.Mock;
const mockFetchListingDetail = fetchListingDetail as jest.Mock;

const MOCK_USER = { id: 1, username: 'testuser', email: 'test@example.com', role: 'user' };

function makeRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Cookie'] = `auth-token=${token}`;
  }
  return new NextRequest('http://localhost:8410/api/listings/123', { headers });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  mockVerifyToken.mockReset();
  mockFetchListingDetail.mockReset();
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('GET /api/listings/[id]', () => {
  describe('authentication', () => {
    it('returns 401 when no auth-token cookie is present and does not call upstream', async () => {
      const response = await GET(makeRequest(), context('123'));

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
      expect(mockFetchListingDetail).not.toHaveBeenCalled();
    });

    it('returns 401 when the token is invalid and does not call upstream', async () => {
      mockVerifyToken.mockReturnValueOnce(null);

      const response = await GET(makeRequest('invalid-token'), context('123'));

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
      expect(mockFetchListingDetail).not.toHaveBeenCalled();
    });
  });

  describe('id validation', () => {
    it.each(['not-a-number', '0', '-1', '1.5', '99999999999999999999'])(
      'returns 400 for malformed id %s without calling upstream',
      async (id) => {
        mockVerifyToken.mockReturnValueOnce(MOCK_USER);

        const response = await GET(makeRequest('valid-token'), context(id));

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Invalid listing id' });
        expect(mockFetchListingDetail).not.toHaveBeenCalled();
      },
    );
  });

  describe('success', () => {
    it('returns the slim listing DTO produced by the enrichment-db client', async () => {
      const listing = { id: 123, price: 450000, images: [{ id: 1 }] };
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchListingDetail.mockResolvedValueOnce(listing);

      const response = await GET(makeRequest('valid-token'), context('123'));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(listing);
      expect(mockFetchListingDetail).toHaveBeenCalledWith(123);
    });
  });

  describe('upstream failure', () => {
    it('maps an upstream 404 to a stable not-found response', async () => {
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchListingDetail.mockRejectedValueOnce(
        new EnrichmentDbClientError('Enrichment-db upstream returned 404', 404),
      );

      const response = await GET(makeRequest('valid-token'), context('123'));

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Listing not found' });
    });

    it('maps an upstream 5xx to a stable bad-gateway response without leaking upstream detail', async () => {
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchListingDetail.mockRejectedValueOnce(
        new EnrichmentDbClientError('Enrichment-db upstream returned 503', 503),
      );

      const response = await GET(makeRequest('valid-token'), context('123'));

      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Listing could not be retrieved from the upstream service.',
      });
      expect(JSON.stringify(body)).not.toContain('503');
    });

    it('maps a client-side network error to a 502', async () => {
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchListingDetail.mockRejectedValueOnce(
        new EnrichmentDbClientError('Network error fetching listing 123: connection refused', 0),
      );

      const response = await GET(makeRequest('valid-token'), context('123'));

      expect(response.status).toBe(502);
    });

    it('maps a server misconfiguration to a 500 distinct from upstream 502', async () => {
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchListingDetail.mockRejectedValueOnce(
        new EnrichmentDbConfigError('ENRICHMENT_DB_API_KEY is not configured'),
      );

      const response = await GET(makeRequest('valid-token'), context('123'));

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: 'Internal server error' });
      expect(JSON.stringify(body)).not.toContain('ENRICHMENT_DB_API_KEY');
    });

    it('maps an unexpected error to a 500', async () => {
      mockVerifyToken.mockReturnValueOnce(MOCK_USER);
      mockFetchListingDetail.mockRejectedValueOnce(new Error('boom'));

      const response = await GET(makeRequest('valid-token'), context('123'));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Internal server error' });
    });
  });
});
