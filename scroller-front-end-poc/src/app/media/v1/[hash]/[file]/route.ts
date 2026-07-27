import { NextRequest, NextResponse } from 'next/server';
import {
  EnrichmentDbClientError,
  EnrichmentDbConfigError,
  fetchImageVariant,
  isImageVariant,
} from '@/lib/enrichment-db-client';
import { isValidContentHash } from '@/lib/media-url';

export const dynamic = 'force-dynamic';

// One year. Safe because the URL is content-addressed: these bytes cannot
// change, since re-processing an image yields a different hash and therefore a
// different URL. No purge logic, and a repeat view costs nothing.
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const NOT_FOUND_CACHE_CONTROL = 'public, max-age=60';

function notFound(): NextResponse {
  return new NextResponse(null, {
    status: 404,
    headers: { 'Cache-Control': NOT_FOUND_CACHE_CONTROL },
  });
}

/**
 * Serve a listing image at a display size.
 *
 *     /media/v1/{content_hash}/{variant}.webp
 *
 * Deliberately public and unauthenticated. The content hash is an unguessable
 * sha256, which is what lets these responses be cached by the browser (and
 * later by nginx or a CDN) without an auth sub-request per image — the thing
 * that makes a 20-image carousel cheap. The upstream API key is injected
 * server-side in the client, so no credential is ever exposed here.
 *
 * The `v1` segment is the escape hatch: if the variants are ever re-encoded at
 * different settings, bumping it to `v2` invalidates every cached URL at once,
 * which an `immutable` lifetime otherwise makes impossible.
 *
 * Note the bytes are NOT proxied from the origin site — they are served from
 * our own store, so rendering a listing sends no traffic to the source.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string; file: string }> },
): Promise<NextResponse> {
  const { hash, file } = await params;
  const url = new URL(request.url);

  // Query parameters and encoded aliases have no meaning for content-addressed
  // media and would create multiple browser/CDN cache keys for the same image.
  if (url.search || url.pathname.includes('%')) {
    return notFound();
  }

  // `file` is "{variant}.webp"; the extension exists so caches and CDNs see a
  // normal image URL rather than an opaque path.
  const match = /^([a-z]+)\.webp$/.exec(file);
  if (!match) {
    return notFound();
  }

  const variant = match[1];
  if (!isImageVariant(variant) || !isValidContentHash(hash)) {
    return notFound();
  }

  try {
    const result = await fetchImageVariant(
      hash,
      variant,
      request.headers.get('if-none-match'),
    );

    if (result === null) {
      return notFound();
    }

    if (result.contentType.split(';', 1)[0].trim().toLowerCase() !== 'image/webp') {
      console.error(`Image variant upstream returned ${result.contentType}, expected image/webp`);
      return new NextResponse(null, { status: 502 });
    }

    const headers = new Headers({
      'Content-Type': 'image/webp',
      'Cache-Control': IMMUTABLE_CACHE_CONTROL,
      'X-Content-Type-Options': 'nosniff',
    });
    if (result.etag) {
      headers.set('ETag', result.etag);
    }

    // Upstream already confirmed the caller's copy is current.
    if (result.body.byteLength === 0 && request.headers.get('if-none-match')) {
      return new NextResponse(null, { status: 304, headers });
    }

    return new NextResponse(result.body, { status: 200, headers });
  } catch (error) {
    if (error instanceof EnrichmentDbConfigError) {
      console.error('Enrichment-db is not configured:', error.message);
      return new NextResponse(null, { status: 500 });
    }
    if (error instanceof EnrichmentDbClientError) {
      console.error('Image variant upstream error:', error.message);
      return new NextResponse(null, { status: 502 });
    }
    console.error('Unexpected image variant error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
