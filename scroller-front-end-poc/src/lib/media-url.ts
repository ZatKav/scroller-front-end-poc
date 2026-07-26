import { appPath } from '@/lib/base-path';
import type { ImageVariant } from '@/lib/enrichment-db-client';

// Intrinsic widths of the pre-rendered variants, in step with the upstream
// backfill. Used to build a `srcset` so the browser can pick the smallest file
// that still covers the slot at the device's pixel ratio.
export const VARIANT_WIDTHS: Record<ImageVariant, number> = {
  thumb: 400,
  card: 828,
  full: 1280,
};

// Bump alongside the `v1` segment in the route if variants are ever re-encoded;
// it is what makes an `immutable` cache lifetime safe to hand out.
const MEDIA_VERSION = 'v1';

/** A public media identity is exactly one lowercase hexadecimal sha256. */
export function isValidContentHash(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

/**
 * URL for one image variant. Content-addressed, so it can be cached forever.
 * Built through `appPath` because these are browser-side URLs, which do not get
 * the deployed base path applied automatically.
 */
export function mediaUrl(contentHash: string, variant: ImageVariant): string {
  if (!isValidContentHash(contentHash)) {
    throw new Error('Invalid image content hash');
  }
  return appPath(`/media/${MEDIA_VERSION}/${contentHash}/${variant}.webp`);
}

/**
 * A `srcset` across every variant, so the browser downloads the size it
 * actually needs rather than the largest one available. Pair with `sizes` to
 * describe the slot; without it the browser assumes full viewport width and
 * over-fetches.
 */
export function mediaSrcSet(
  contentHash: string,
  sourceWidth?: number | null,
): string {
  const intrinsicWidth =
    typeof sourceWidth === 'number' && Number.isFinite(sourceWidth) && sourceWidth > 0
      ? Math.floor(sourceWidth)
      : null;
  const seenWidths = new Set<number>();

  return (Object.keys(VARIANT_WIDTHS) as ImageVariant[])
    .flatMap((variant) => {
      const width = intrinsicWidth
        ? Math.min(VARIANT_WIDTHS[variant], intrinsicWidth)
        : VARIANT_WIDTHS[variant];
      if (seenWidths.has(width)) {
        return [];
      }
      seenWidths.add(width);
      return [`${mediaUrl(contentHash, variant)} ${width}w`];
    })
    .join(', ');
}
