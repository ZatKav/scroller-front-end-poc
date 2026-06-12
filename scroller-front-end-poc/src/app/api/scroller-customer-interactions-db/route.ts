import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

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

function getProxyHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY}`,
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

function getInteractionCustomerId(path: string): number | null {
  const pathname = path.split('?')[0];
  const match = pathname.match(/^\/customer-(?:image|listing)-interactions\/(\d+)$/);
  if (!match) {
    return null;
  }

  const customerId = match[1];
  return customerId === undefined ? null : Number(customerId);
}

function getCreateInteractionCustomerId(path: string, body: unknown): number | null {
  if (path !== '/customer-image-interactions' && path !== '/customer-listing-interactions') {
    return null;
  }

  if (typeof body !== 'object' || body === null || !('customer_id' in body)) {
    return Number.NaN;
  }

  return Number((body as { customer_id: unknown }).customer_id);
}

function getCustomerAuthorizationError(
  request: NextRequest,
  customerId: number | null,
): NextResponse | null {
  if (customerId === null) {
    return null;
  }

  if (!Number.isInteger(customerId)) {
    return NextResponse.json({ error: 'Invalid customer id' }, { status: 400 });
  }

  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.id !== customerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY) {
    return getMissingApiKeyResponse();
  }

  const path = getPathFromRequest(request);
  if (!path) {
    return getInvalidPathResponse();
  }

  const authError = getCustomerAuthorizationError(request, getInteractionCustomerId(path));
  if (authError) {
    return authError;
  }

  try {
    const response = await fetch(`${SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL}/api${path}`, {
      headers: getProxyHeaders(),
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
  if (!SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY) {
    return getMissingApiKeyResponse();
  }

  const path = getPathFromRequest(request);
  if (!path) {
    return getInvalidPathResponse();
  }

  const authError = getCustomerAuthorizationError(request, getInteractionCustomerId(path));
  if (authError) {
    return authError;
  }

  try {
    const response = await fetch(`${SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL}/api${path}`, {
      method: 'DELETE',
      headers: getProxyHeaders(),
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
  if (!SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY) {
    return getMissingApiKeyResponse();
  }

  const path = getPathFromRequest(request);
  if (!path) {
    return getInvalidPathResponse();
  }

  try {
    const body = await request.json();
    const authError = getCustomerAuthorizationError(
      request,
      getCreateInteractionCustomerId(path, body),
    );
    if (authError) {
      return authError;
    }

    const response = await fetch(`${SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL}/api${path}`, {
      method: 'POST',
      headers: getProxyHeaders(),
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
