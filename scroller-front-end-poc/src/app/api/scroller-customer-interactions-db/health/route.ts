import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL =
  process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL || 'http://localhost:8300';
const SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY = process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY;

export async function GET(): Promise<NextResponse> {
  try {
    const response = await fetch(`${SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL}/health`, {
      headers: {
        'Content-Type': 'application/json',
        ...(SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY && {
          Authorization: `Bearer ${SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY}`,
        }),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { status: 'unhealthy', detail: `Health probe error: ${errorText}` },
        { status: 200 },
      );
    }

    const healthPayload = (await response.json()) as { status?: string };
    return NextResponse.json({ status: healthPayload.status || 'healthy' }, { status: 200 });
  } catch (error) {
    console.error('Error during scroller customer interactions DB health probe:', error);
    return NextResponse.json(
      { status: 'unhealthy', detail: 'Failed to reach scroller customer interactions DB API' },
      { status: 200 },
    );
  }
}
