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

/**
 * URL for one image variant. Content-addressed, so it can be cached forever.
 * Built through `appPath` because these are browser-side URLs, which do not get
 * the deployed base path applied automatically.
 */
export function mediaUrl(contentHash: string, variant: ImageVariant): string {
  return appPath(`/media/${MEDIA_VERSION}/${contentHash}/${variant}.webp`);
}

/**
 * A `srcset` across every variant, so the browser downloads the size it
 * actually needs rather than the largest one available. Pair with `sizes` to
 * describe the slot; without it the browser assumes full viewport width and
 * over-fetches.
 */
export function mediaSrcSet(contentHash: string): string {
  return (Object.keys(VARIANT_WIDTHS) as ImageVariant[])
    .map((variant) => `${mediaUrl(contentHash, variant)} ${VARIANT_WIDTHS[variant]}w`)
    .join(', ');
}
