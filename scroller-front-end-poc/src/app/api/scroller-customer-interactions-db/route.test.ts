/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const BASE_URL = 'http://localhost:8400';
const API_KEY = 'test-api-key';

function makeRequest(path?: string): NextRequest {
  const query = path === undefined ? '' : `?path=${encodeURIComponent(path)}`;
  return new NextRequest(`http://localhost:8410/api/scroller-customer-interactions-db${query}`, {
    method: 'DELETE',
  });
}

function loadDelete() {
  let handler: typeof import('./route').DELETE;
  jest.isolateModules(() => {
    handler = require('./route').DELETE;
  });
  return handler!;
}

const mockFetch = jest.fn();

beforeEach(() => {
  jest.resetModules();
  mockFetch.mockReset();
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
        headers: expect.objectContaining({ Authorization: `Bearer ${API_KEY}` }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: 4 });
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
