import { NextRequest, NextResponse } from 'next/server';
import { generateCustomerCredential, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL =
  process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL || 'http://localhost:8400';
const SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY = process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY;

function getPathFromRequest(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path || !path.startsWith('/')) {
    return null;
  }

  return path;
}

function getProxyHeaders(customerCredential: string): Record<string, string> {
  return {
    Authorization: `Bearer ${SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY}`,
    'X-Scroller-Customer-Authorization': `Bearer ${customerCredential}`,
    'Content-Type': 'application/json',
  };
}

function getMissingApiKeyResponse(): NextResponse {
  console.error('SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY environment variable is not set');
  return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
}

function getInvalidPathResponse(): NextResponse {
  return NextResponse.json({ error: 'Missing or invalid path query parameter' }, { status: 400 });
}

function getCustomerContext(request: NextRequest):
  | { customerId: number; customerCredential: string }
  | NextResponse {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return {
      customerId: user.id,
      customerCredential: generateCustomerCredential(user.id),
    };
  } catch (error) {
    console.error('Customer credential is not configured:', error);
    return NextResponse.json({ error: 'Customer authentication is not configured' }, { status: 500 });
  }
}

function getInteractionCustomerId(path: string, method: 'GET' | 'DELETE'): number | null {
  const parsedPath = new URL(path, 'http://proxy.invalid');
  const match = parsedPath.pathname.match(/^\/customer-(?:image|listing)-interactions\/([1-9]\d*)$/);
  if (!match) return null;

  if (method === 'DELETE' && parsedPath.search) return null;
  const allowedQueryKeys = new Set(['skip', 'limit', 'action', 'all_results']);
  if (method === 'GET') {
    for (const key of parsedPath.searchParams.keys()) {
      if (!allowedQueryKeys.has(key) || parsedPath.searchParams.getAll(key).length !== 1) return null;
    }
  }

  return Number(match[1]);
}

function getCreateInteractionCustomerId(path: string, body: unknown): number | null {
  if (path !== '/customer-image-interactions' && path !== '/customer-listing-interactions') return null;
  if (typeof body !== 'object' || body === null || !('customer_id' in body)) return null;
  const customerId = Number((body as { customer_id: unknown }).customer_id);
  return Number.isInteger(customerId) && customerId > 0 ? customerId : null;
}

function getCustomerMismatchError(requestedCustomerId: number, authenticatedCustomerId: number): NextResponse | null {
  return requestedCustomerId === authenticatedCustomerId
    ? null
    : NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = getCustomerContext(request);
  if (context instanceof NextResponse) return context;

  if (!SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY) {
    return getMissingApiKeyResponse();
  }

  const path = getPathFromRequest(request);
  if (!path) {
    return getInvalidPathResponse();
  }

  const requestedCustomerId = getInteractionCustomerId(path, 'GET');
  if (requestedCustomerId === null) return NextResponse.json({ error: 'Path not allowed' }, { status: 400 });
  const mismatchError = getCustomerMismatchError(requestedCustomerId, context.customerId);
  if (mismatchError) return mismatchError;

  try {
    const response = await fetch(`${SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL}/api${path}`, {
      headers: getProxyHeaders(context.customerCredential),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Scroller customer interactions DB API error: ${errorText}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error calling scroller customer interactions DB API:', error);
    return NextResponse.json(
      { error: 'Failed to connect to scroller customer interactions DB API' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const context = getCustomerContext(request);
  if (context instanceof NextResponse) return context;

  if (!SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY) {
    return getMissingApiKeyResponse();
  }

  const path = getPathFromRequest(request);
  if (!path) {
    return getInvalidPathResponse();
  }

  const requestedCustomerId = getInteractionCustomerId(path, 'DELETE');
  if (requestedCustomerId === null) return NextResponse.json({ error: 'Path not allowed' }, { status: 400 });
  const mismatchError = getCustomerMismatchError(requestedCustomerId, context.customerId);
  if (mismatchError) return mismatchError;

  try {
    const response = await fetch(`${SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL}/api${path}`, {
      method: 'DELETE',
      headers: getProxyHeaders(context.customerCredential),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Scroller customer interactions DB API error: ${errorText}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error calling scroller customer interactions DB API:', error);
    return NextResponse.json(
      { error: 'Failed to connect to scroller customer interactions DB API' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = getCustomerContext(request);
  if (context instanceof NextResponse) return context;

  if (!SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY) {
    return getMissingApiKeyResponse();
  }

  const path = getPathFromRequest(request);
  if (!path) {
    return getInvalidPathResponse();
  }

  try {
    const body = await request.json();
    const requestedCustomerId = getCreateInteractionCustomerId(path, body);
    if (requestedCustomerId === null) return NextResponse.json({ error: 'Path not allowed' }, { status: 400 });
    const mismatchError = getCustomerMismatchError(requestedCustomerId, context.customerId);
    if (mismatchError) return mismatchError;

    const response = await fetch(`${SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL}/api${path}`, {
      method: 'POST',
      headers: getProxyHeaders(context.customerCredential),
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Scroller customer interactions DB API error: ${errorText}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error calling scroller customer interactions DB API:', error);
    return NextResponse.json(
      { error: 'Failed to connect to scroller customer interactions DB API' },
      { status: 500 },
    );
  }
}
