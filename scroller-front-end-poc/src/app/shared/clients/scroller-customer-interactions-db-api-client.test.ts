import {
  APIError,
  scrollerCustomerInteractionsDbApiClient,
} from '@/app/shared/clients/scroller-customer-interactions-db-api-client';

const mockFetch = jest.fn();

describe('APIError', () => {
  it('creates an APIError with message and status', () => {
    const error = new APIError('Test error', 404);
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(404);
    expect(error.name).toBe('APIError');
  });
});

describe('scrollerCustomerInteractionsDbApiClient', () => {
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  describe('healthCheck', () => {
    it('calls the proxied health endpoint', async () => {
      const mockResponse = { status: 'ok' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await scrollerCustomerInteractionsDbApiClient.healthCheck();

      expect(mockFetch).toHaveBeenCalledWith('/api/scroller-customer-interactions-db/health');
      expect(result).toEqual(mockResponse);
    });

    it('throws APIError on non-2xx health responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      } as Response);

      const error = await scrollerCustomerInteractionsDbApiClient
        .healthCheck()
        .catch((caughtError: unknown) => caughtError as APIError);

      expect(error).toBeInstanceOf(APIError);
      expect(error.status).toBe(500);
      expect(error.message).toBe('Health check request failed: Internal Server Error');
    });
  });

  describe('getCustomerImageInteractions', () => {
    it('fetches customer interactions with default pagination', async () => {
      const mockResponse = [{ id: 1, customer_id: 100, image_id: 20, action: 1, view_duration_ms: 123, viewed_at: '2026-03-24T10:00:00Z' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await scrollerCustomerInteractionsDbApiClient.getCustomerImageInteractions(100);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/scroller-customer-interactions-db?path=%2Fcustomer-image-interactions%2F100%3Fskip%3D0%26limit%3D100',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('includes action filter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      await scrollerCustomerInteractionsDbApiClient.getCustomerImageInteractions(100, 10, 20, 1);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/scroller-customer-interactions-db?path=%2Fcustomer-image-interactions%2F100%3Fskip%3D10%26limit%3D20%26action%3D1',
        expect.any(Object),
      );
    });
  });

  describe('createCustomerImageInteraction', () => {
    it('posts interaction payload and returns created interaction', async () => {
      const payload = { customer_id: 1, image_id: 2, action: 0 as const, view_duration_ms: 55 };
      const mockResponse = {
        id: 10,
        customer_id: 1,
        image_id: 2,
        action: 0,
        view_duration_ms: 55,
        viewed_at: '2026-03-24T11:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await scrollerCustomerInteractionsDbApiClient.createCustomerImageInteraction(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/scroller-customer-interactions-db?path=%2Fcustomer-image-interactions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getStackRankImages', () => {
    it('fetches stack-rank image cards', async () => {
      const mockResponse = [{ id: 1, image_data: 'data:image/png;base64,AAA=', image_summary: 'Summary' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await scrollerCustomerInteractionsDbApiClient.getStackRankImages();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/scroller-customer-interactions-db?path=%2Fimages%2Fstack-rank',
        expect.any(Object),
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error propagation', () => {
    it('throws APIError for backend non-2xx responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: () => Promise.resolve('Bad gateway'),
      } as Response);

      const error = await scrollerCustomerInteractionsDbApiClient
        .getStackRankImages()
        .catch((caughtError: unknown) => caughtError as APIError);

      expect(error).toBeInstanceOf(APIError);
      expect(error.status).toBe(502);
      expect(error.message).toBe('API request failed: Bad gateway');
    });

    it('throws APIError for network failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('connection dropped'));

      const error = await scrollerCustomerInteractionsDbApiClient
        .getStackRankImages()
        .catch((caughtError: unknown) => caughtError as APIError);

      expect(error).toBeInstanceOf(APIError);
      expect(error.status).toBe(0);
      expect(error.message).toBe('Network error: connection dropped');
    });
  });
});
