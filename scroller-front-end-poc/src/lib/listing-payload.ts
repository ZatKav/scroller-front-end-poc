import type { ListingDetail, ListingDetailImage } from '@/types/enrichment-db';

/**
 * Reduce an upstream listing to the fields the browser actually renders.
 *
 * The upstream payload embeds every image twice over: once as base64 bytes in
 * `image_data` and again as a large `image_analysis` blob, neither of which the
 * UI reads. A six-listing feed window measured 49.9MB, 92% of it base64, to
 * display one image. Images are now addressed by `content_hash` and fetched
 * from /media as ordinary cacheable files, so none of those bytes need to be in
 * the JSON at all.
 *
 * This is a whitelist rather than a blacklist on purpose: a new heavy field
 * added upstream should not silently start shipping to every client. Anything
 * the UI needs has to be added here deliberately.
 *
 * `url` is dropped as well. It points at the third-party asset host the images
 * were harvested from, and there is no reason to expose that to the browser.
 */

/** An image reference: enough to render it, with none of the bytes. */
export interface ListingImageRef {
  id: number;
  /** Addresses the pre-rendered variants at /media/v1/{content_hash}/{variant}.webp */
  content_hash: string | null;
  alt_text: string | null;
  position: number | null;
  is_primary: boolean;
  /** Intrinsic size of the master, used to reserve layout space and avoid CLS. */
  width: number | null;
  height: number | null;
}

export interface SlimListing {
  id: number;
  title: string | null;
  short_description: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_tags: string | null;
  first_seen: string | null;
  location: ListingDetail['location'];
  images: ListingImageRef[];
}

function toImageRef(image: ListingDetailImage): ListingImageRef {
  return {
    id: image.id,
    content_hash: image.content_hash ?? null,
    alt_text: image.alt_text ?? null,
    position: image.position ?? null,
    is_primary: Boolean(image.is_primary),
    width: image.width ?? null,
    height: image.height ?? null,
  };
}

export function slimListing(listing: ListingDetail): SlimListing {
  const images = Array.isArray(listing.images) ? listing.images : [];

  return {
    id: listing.id,
    title: listing.title ?? null,
    short_description: listing.short_description ?? null,
    price: listing.price ?? null,
    bedrooms: listing.bedrooms ?? null,
    bathrooms: listing.bathrooms ?? null,
    property_tags: listing.property_tags ?? null,
    first_seen: listing.first_seen ?? null,
    location: listing.location ?? null,
    // An image with no content_hash cannot be addressed at /media, so it would
    // render as a broken slot. Drop it here so the carousel's dots and paging
    // only ever reflect images that can actually load.
    images: images.filter((image) => Boolean(image.content_hash)).map(toImageRef),
  };
}

export function slimListings(listings: ListingDetail[]): SlimListing[] {
  return listings.map(slimListing);
}
