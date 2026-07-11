import {
  CustomerImageInteraction,
  CustomerImageInteractionCreate,
  CustomerListingInteraction,
  CustomerListingInteractionCreate,
  StackRankImage,
} from '@/types/scroller-customer-interactions-db';
import { appPath } from '@/lib/base-path';

// These calls run in the browser, so the deployed base path is not applied
// automatically; build the proxy URL through `appPath` so requests resolve under
// `/scroller` rather than hitting the root path and 404-ing.
const BASE_URL = appPath('/api/scroller-customer-interactions-db');

export class APIError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'APIError';
  }
}

async function readErrorText(response: Response): Promise<string> {
  try {
    const errorText = await response.text();
    return errorText || response.statusText || 'Unknown error';
  } catch {
    return response.statusText || 'Unknown error';
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}?path=${encodeURIComponent(endpoint)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await readErrorText(response);
      throw new APIError(`API request failed: ${errorText}`, response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0,
    );
  }
}

export const scrollerCustomerInteractionsDbApiClient = {
  async healthCheck(): Promise<{ status: string; detail?: string }> {
    try {
      const response = await fetch(`${BASE_URL}/health`);

      if (!response.ok) {
        const errorText = await readErrorText(response);
        throw new APIError(`Health check request failed: ${errorText}`, response.status);
      }

      return (await response.json()) as { status: string; detail?: string };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError(
        `Network error during health check: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
      );
    }
  },

  async getCustomerImageInteractions(
    customerId: number,
    skip: number = 0,
    limit: number = 100,
    action?: 0 | 1,
  ): Promise<CustomerImageInteraction[]> {
    const queryParams = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });

    if (action !== undefined) {
      queryParams.set('action', String(action));
    }

    return request<CustomerImageInteraction[]>(
      `/customer-image-interactions/${customerId}?${queryParams.toString()}`,
    );
  },

  async createCustomerImageInteraction(
    payload: CustomerImageInteractionCreate,
  ): Promise<CustomerImageInteraction> {
    return request<CustomerImageInteraction>('/customer-image-interactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteCustomerImageInteractions(customerId: number): Promise<{ deleted: number }> {
    return request<{ deleted: number }>(`/customer-image-interactions/${customerId}`, {
      method: 'DELETE',
    });
  },

  async getCustomerListingInteractions(
    customerId: number,
    skip: number = 0,
    limit: number = 100,
    action?: 0 | 1 | 2,
  ): Promise<CustomerListingInteraction[]> {
    const queryParams = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });

    if (action !== undefined) {
      queryParams.set('action', String(action));
    }

    return request<CustomerListingInteraction[]>(
      `/customer-listing-interactions/${customerId}?${queryParams.toString()}`,
    );
  },

  async createCustomerListingInteraction(
    payload: CustomerListingInteractionCreate,
  ): Promise<CustomerListingInteraction> {
    return request<CustomerListingInteraction>('/customer-listing-interactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteCustomerListingInteractions(customerId: number): Promise<{ deleted: number }> {
    return request<{ deleted: number }>(`/customer-listing-interactions/${customerId}`, {
      method: 'DELETE',
    });
  },

  async getStackRankImages(skip: number = 0, limit: number = 10): Promise<StackRankImage[]> {
    const queryParams = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });

    return request<StackRankImage[]>(`/images/stack-rank?${queryParams.toString()}`);
  },
};
