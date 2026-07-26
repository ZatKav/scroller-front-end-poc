/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const BASE_URL = 'http://localhost:8400';
const API_KEY = 'test-api-key';
const AUTH_COOKIE = 'auth-token=valid-token';

const mockVerifyToken = jest.fn();
const mockGenerateCustomerCredential = jest.fn(() => 'customer-credential');

jest.mock('@/lib/auth', () => ({
  generateCustomerCredential: (customerId: number) => mockGenerateCustomerCredential(customerId),
  verifyToken: (token: string) => mockVerifyToken(token),
}));

function makeRequest(path?: string, cookie: string | null = AUTH_COOKIE): NextRequest {
  const query = path === undefined ? '' : `?path=${encodeURIComponent(path)}`;
  return new NextRequest(`http://localhost:8410/api/scroller-customer-interactions-db${query}`, {
    method: 'DELETE',
    headers: cookie ? { Cookie: cookie } : undefined,
  });
}

function loadDelete() {
  let handler: typeof import('./route').DELETE;
  jest.isolateModules(() => {
    handler = require('./route').DELETE;
  });
  return handler!;
}

function loadGet() {
  let handler: typeof import('./route').GET;
  jest.isolateModules(() => {
    handler = require('./route').GET;
  });
  return handler!;
}

function loadPost() {
  let handler: typeof import('./route').POST;
  jest.isolateModules(() => {
    handler = require('./route').POST;
  });
  return handler!;
}

function makePostRequest(path: string, body: object, cookie: string | null = AUTH_COOKIE): NextRequest {
  const query = `?path=${encodeURIComponent(path)}`;
  return new NextRequest(`http://localhost:8410/api/scroller-customer-interactions-db${query}`, {
    method: 'POST',
    headers: cookie ? { Cookie: cookie } : undefined,
    body: JSON.stringify(body),
  });
}

const mockFetch = jest.fn();

beforeEach(() => {
  jest.resetModules();
  mockFetch.mockReset();
  mockVerifyToken.mockReset();
  mockGenerateCustomerCredential.mockClear();
  mockVerifyToken.mockReturnValue({
    id: 100,
    username: 'customer',
    email: 'customer@example.com',
    role: 'user',
  });
  global.fetch = mockFetch as unknown as typeof fetch;
  process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL = BASE_URL;
  process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY = API_KEY;
});

describe('DELETE /api/scroller-customer-interactions-db', () => {
  it('forwards the delete to the upstream API and returns its payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ deleted: 4 }),
    } as Response);

    const response = await loadDelete()(makeRequest('/customer-image-interactions/100'));

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/customer-image-interactions/100`,
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: `Bearer ${API_KEY}`,
          'X-Scroller-Customer-Authorization': 'Bearer customer-credential',
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: 4 });
  });

  it('rejects customer interaction deletes without an authenticated session', async () => {
    const response = await loadDelete()(makeRequest('/customer-listing-interactions/100', null));

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects customer interaction deletes for a different customer', async () => {
    mockVerifyToken.mockReturnValue({
      id: 101,
      username: 'other-customer',
      email: 'other@example.com',
      role: 'user',
    });

    const response = await loadDelete()(makeRequest('/customer-listing-interactions/100'));

    expect(response.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 400 when the path query parameter is missing', async () => {
    const response = await loadDelete()(makeRequest());

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 500 when the API key is not configured', async () => {
    delete process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY;

    const response = await loadDelete()(makeRequest('/customer-image-interactions/100'));

    expect(response.status).toBe(500);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('propagates upstream error status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    } as Response);

    const response = await loadDelete()(makeRequest('/customer-image-interactions/100'));

    expect(response.status).toBe(401);
  });
});

describe('POST /api/scroller-customer-interactions-db', () => {
  it('forwards customer interaction creates for the authenticated customer', async () => {
    const payload = { customer_id: 100, listing_id: 25, action: 1, view_duration_ms: 300 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 1, ...payload }),
    } as Response);

    const response = await loadPost()(makePostRequest('/customer-listing-interactions', payload));

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/customer-listing-interactions`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          Authorization: `Bearer ${API_KEY}`,
          'X-Scroller-Customer-Authorization': 'Bearer customer-credential',
        }),
      }),
    );
    expect(response.status).toBe(200);
  });

  it('rejects customer interaction creates for a different customer', async () => {
    const payload = { customer_id: 101, listing_id: 25, action: 1, view_duration_ms: 300 };

    const response = await loadPost()(makePostRequest('/customer-listing-interactions', payload));

    expect(response.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('GET /api/scroller-customer-interactions-db', () => {
  it('rejects unknown upstream paths even for an authenticated customer', async () => {
    const request = new NextRequest(
      'http://localhost:8410/api/scroller-customer-interactions-db?path=%2Fimages%2Fstack-rank%3Fcustomer_id%3D100',
      { headers: { Cookie: AUTH_COOKIE } },
    );

    const response = await loadGet()(request);

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects every request without an authenticated session', async () => {
    const request = new NextRequest(
      'http://localhost:8410/api/scroller-customer-interactions-db?path=%2Fcustomer-image-interactions%2F100',
    );

    const response = await loadGet()(request);

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
