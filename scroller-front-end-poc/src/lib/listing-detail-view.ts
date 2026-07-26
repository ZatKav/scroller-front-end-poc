// Pure mapping from the enrichment-db ListingDetail payload (FE-2 BFF) to the
// shape the detail page renders. All derivation lives here, deterministic and
// unit-tested in isolation, so the page component stays presentational and the
// hide-empty-fields rule is expressed once as `null`/empty in the view-model.

import type {
  ListingDetail,
  ListingDetailAddress,
  ListingDetailImage,
} from '@/types/enrichment-db';
import type { CarouselImage } from '@/components/ListingImageCarousel';
import { isValidContentHash } from '@/lib/media-url';

// `New` recency window: a listing first seen within this many days is New
// (PRO-255 decision — 7 days).
export const NEW_TAG_WINDOW_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ListingDetailView {
  id: number;
  title: string | null;
  // Pre-formatted GBP price, e.g. "£450,000", or null when there is no price.
  price: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  location: string | null;
  description: string | null;
  tags: string[];
  images: CarouselImage[];
}

function trimmedOrNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Format a numeric price as GBP with thousands separators and no decimals, e.g.
 * 450000 -> "£450,000". Currency is hardcoded to GBP: the contract carries a
 * bare numeric price with no currency field (PRO-255 decision). Returns null
 * when there is no usable price so the page hides the field rather than showing
 * an empty "£".
 */
export function formatPrice(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}£${digits}`;
}

/**
 * True when `firstSeen` is within NEW_TAG_WINDOW_DAYS of `now`. An absent or
 * unparseable timestamp is not New.
 */
export function isNew(
  firstSeen: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!firstSeen) {
    return false;
  }
  const seen = new Date(firstSeen);
  if (Number.isNaN(seen.getTime())) {
    return false;
  }
  const ageMs = now.getTime() - seen.getTime();
  return ageMs <= NEW_TAG_WINDOW_DAYS * MS_PER_DAY;
}

function hasGarden(propertyTags: string | null | undefined): boolean {
  return typeof propertyTags === 'string' && /garden/i.test(propertyTags);
}

/**
 * Derive the feature pills shown on the detail page. `New` comes from
 * `first_seen` recency; `Garden` is a best-effort substring match on the
 * free-text `property_tags`.
 */
export function deriveTags(
  propertyTags: string | null | undefined,
  firstSeen: string | null | undefined,
  now: Date = new Date(),
): string[] {
  const tags: string[] = [];
  if (isNew(firstSeen, now)) {
    tags.push('New');
  }
  if (hasGarden(propertyTags)) {
    tags.push('Garden');
  }
  return tags;
}

/**
 * Build a single-line location from the available address parts, skipping any
 * that are blank. Returns null when nothing renderable remains.
 */
export function formatLocation(
  address: ListingDetailAddress | null | undefined,
): string | null {
  if (!address) {
    return null;
  }
  const parts = [
    address.address_line_1,
    address.address_line_2,
    address.address_line_3,
    address.address_line_4,
    address.county,
    address.postcode,
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Order a listing's images for the carousel — the primary image first, then by
 * ascending `position` (images without a position sort last) — and map each to
 * the carousel's local shape. Byte-less images are dropped so the carousel's
 * dots and navigation only reflect renderable images.
 */
export function toCarouselImages(
  images: ListingDetailImage[] | null | undefined,
  title: string | null,
): CarouselImage[] {
  if (!Array.isArray(images)) {
    return [];
  }
  // An image with no content_hash cannot be addressed at /media, so it would
  // render as a broken slot. Dropping it here keeps the carousel's dots and
  // paging in step with what can actually load.
  const renderable = images.filter(
    (image): image is ListingDetailImage & { content_hash: string } =>
      isValidContentHash(image.content_hash),
  );
  const ordered = [...renderable].sort((a, b) => {
    const aPrimary = a.is_primary ? 0 : 1;
    const bPrimary = b.is_primary ? 0 : 1;
    if (aPrimary !== bPrimary) {
      return aPrimary - bPrimary;
    }
    const aPosition = a.position ?? Number.MAX_SAFE_INTEGER;
    const bPosition = b.position ?? Number.MAX_SAFE_INTEGER;
    return aPosition - bPosition;
  });
  return ordered.map((image) => ({
    contentHash: image.content_hash,
    alt: trimmedOrNull(image.alt_text) ?? title ?? undefined,
    width: image.width ?? null,
    height: image.height ?? null,
  }));
}

/**
 * Map the enrichment-db ListingDetail payload to the detail page view-model.
 * Missing fields collapse to null/[] so the page can hide them.
 */
export function mapListingToView(
  listing: ListingDetail,
  now: Date = new Date(),
): ListingDetailView {
  const title = trimmedOrNull(listing.title);
  return {
    id: listing.id,
    title,
    price: formatPrice(listing.price),
    bedrooms: typeof listing.bedrooms === 'number' ? listing.bedrooms : null,
    bathrooms: typeof listing.bathrooms === 'number' ? listing.bathrooms : null,
    location: formatLocation(listing.location?.address),
    description: trimmedOrNull(listing.short_description),
    tags: deriveTags(listing.property_tags, listing.first_seen, now),
    images: toCarouselImages(listing.images, title),
  };
}
