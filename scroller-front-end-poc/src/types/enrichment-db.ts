// Typed view of the enrichment-db listing detail contract (EDB-2:
// finder_enrichment_db_contracts.ListingDetail / ListingDetailImage). FE-2
// proxied a deliberately loose `{ id; [k]: unknown }` because the BFF only
// passed the payload through. FE-3 consumes the payload, so it firms up the
// fields the detail page actually reads. Every field beyond `id` stays optional
// and nullable: the page renders defensively and hides anything missing rather
// than assuming the upstream populated it.

export interface ListingDetailAddress {
  postcode?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  address_line_3?: string | null;
  address_line_4?: string | null;
  county?: string | null;
  country?: string | null;
}

export interface ListingDetailLocation {
  address?: ListingDetailAddress | null;
}

export interface ListingDetailImage {
  id: number;
  // Present on the upstream payload; stripped by `slimListing` before anything
  // reaches the browser. Images are addressed by content_hash and fetched from
  // /media instead of being inlined as base64.
  image_data?: string | null;
  // Addresses the pre-rendered display variants at
  // /media/v1/{content_hash}/{variant}.webp. Null for images the backfill has
  // not processed yet, which are dropped rather than rendered broken.
  content_hash?: string | null;
  alt_text?: string | null;
  // Carousel ordering signals: the hero image carries is_primary, and position
  // records each image's slot in the submitted pack. The FE orders on these.
  position?: number | null;
  is_primary?: boolean;
  // Intrinsic master dimensions, used to reserve layout space so images do not
  // shift content as they load.
  width?: number | null;
  height?: number | null;
}

export interface ListingDetail {
  id: number;
  title?: string | null;
  short_description?: string | null;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_tags?: string | null;
  // ISO timestamp; drives the `New` recency tag.
  first_seen?: string | null;
  location?: ListingDetailLocation | null;
  images?: ListingDetailImage[];
}
