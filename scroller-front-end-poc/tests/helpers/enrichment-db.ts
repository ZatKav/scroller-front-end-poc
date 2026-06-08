// Seeding helpers for finder-enrichment-db, used to guarantee the scroller
// stack-rank feed has at least one renderable, stack-rank-eligible image.
//
// The shared CI enrichment-db can be redeployed/wiped independently of the
// front-end, leaving the feed empty ("No more images") and failing every
// scroller-image assertion. Rather than depend on ambient data, the feed E2E
// tests seed their own image here — idempotently, keyed on a fixed external_url
// so repeat runs reuse the same seed instead of piling up duplicates.
//
// The stack-rank "renderable candidate" path only requires an Image row with
// image_data, a listing_id, and an image_summary that the interactions service
// treats as eligible (a valid v2 "photo" summary). We create exactly that.

const SEED_EXTERNAL_URL = 'https://e2e.seed.local/scroller-smoke-listing';
const SEED_IMAGE_URL_PREFIX = 'https://e2e.seed.local/scroller-smoke-image';
const SEED_ORIGINAL_LISTING_ID = 990000001;
const SEED_ORIGINAL_IMAGE_ID_BASE = 990000000;

// The feed tests Like one card and then Skip the next (asserting the two are
// distinct images), so the queue needs at least two renderable cards. Seed a
// few for margin. stack-rank serves multiple images from the same listing, so
// one seed listing with several images is sufficient.
const SEED_IMAGE_COUNT = 3;

// The only image_summary shape stack-rank treats as an eligible card — a valid
// v2 "photo" summary (scroller-customer-interactions-db
// is_stack_rank_eligible_photo_summary / extract_image_summary_features).
const SEED_IMAGE_SUMMARY = JSON.stringify({
  schema_version: 2,
  asset_type: 'photo',
  subject: 'living_room',
  subject_confidence: 'high',
  architectural_style: null,
  decor_style: ['modern', 'neutral'],
  materials: ['carpet', 'painted_wall'],
  dominant_colours: ['white', 'grey'],
  condition: 'good',
  presentation: 'good',
  quality_flags: [],
});

// A small, valid JPEG (8x8) so the rendered <img data-testid="scroller-image">
// loads and has a non-empty box. The front-end builds the src as
// `data:image/jpeg;base64,<image_data>`.
const SEED_IMAGE_DATA_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCtRRRX0x5J/9k=';

interface EnrichmentDbConfig {
  baseUrl: string;
  headers: Record<string, string>;
}

function getEnrichmentDbConfig(): EnrichmentDbConfig {
  const baseUrl = process.env.ENRICHMENT_DB_BASE_URL;
  const apiKey = process.env.ENRICHMENT_DB_API_KEY;

  if (!baseUrl) {
    throw new Error('ENRICHMENT_DB_BASE_URL must be set to seed the scroller feed.');
  }
  if (!apiKey) {
    throw new Error('ENRICHMENT_DB_API_KEY must be set to seed the scroller feed.');
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
}

async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  return `${response.status} ${response.statusText}${text ? `: ${text}` : ''}`;
}

async function getOrCreateEstateAgent(config: EnrichmentDbConfig): Promise<number> {
  const { baseUrl, headers } = config;

  const listResponse = await fetch(`${baseUrl}/api/estate-agents/?skip=0&limit=1`, { headers });
  if (listResponse.ok) {
    const agents = await listResponse.json();
    if (Array.isArray(agents) && agents.length > 0 && typeof agents[0]?.id === 'number') {
      return agents[0].id;
    }
  } else if (listResponse.status !== 404) {
    throw new Error(`Failed to list estate agents (${await readError(listResponse)})`);
  }

  const createResponse = await fetch(`${baseUrl}/api/estate-agents/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'E2E Seed Agent' }),
  });
  if (!createResponse.ok) {
    throw new Error(`Failed to create estate agent (${await readError(createResponse)})`);
  }
  return (await createResponse.json()).id as number;
}

// Per-seed image identity so distinct seed listings (feed vs detail) never reuse
// the same globally-unique original_image_id. Defaults to the feed seed space.
interface SeedImageSpace {
  originalImageIdBase: number;
  urlPrefix: string;
}

const FEED_IMAGE_SPACE: SeedImageSpace = {
  originalImageIdBase: SEED_ORIGINAL_IMAGE_ID_BASE,
  urlPrefix: SEED_IMAGE_URL_PREFIX,
};

async function addSeedImage(
  config: EnrichmentDbConfig,
  listingId: number,
  index: number,
  space: SeedImageSpace = FEED_IMAGE_SPACE,
): Promise<void> {
  const { baseUrl, headers } = config;
  const response = await fetch(`${baseUrl}/api/listings/${listingId}/images/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      url: `${space.urlPrefix}-${index}.jpg`,
      original_image_id: space.originalImageIdBase + index,
      listing_id: listingId,
      image_summary: SEED_IMAGE_SUMMARY,
      image_data: SEED_IMAGE_DATA_BASE64,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to add seed image to listing ${listingId} (${await readError(response)})`);
  }
}

// Top up the listing to SEED_IMAGE_COUNT renderable images, adding only what is
// missing so repeat calls are idempotent.
async function ensureListingHasImages(
  config: EnrichmentDbConfig,
  listing: { id: number; images?: Array<{ image_data?: string | null }> },
  space: SeedImageSpace = FEED_IMAGE_SPACE,
): Promise<void> {
  const existing = Array.isArray(listing.images)
    ? listing.images.filter((image) => image.image_data).length
    : 0;
  for (let index = existing; index < SEED_IMAGE_COUNT; index += 1) {
    await addSeedImage(config, listing.id, index, space);
  }
}

/**
 * Ensure the scroller feed has at least `SEED_IMAGE_COUNT` renderable,
 * stack-rank-eligible images. Idempotent: reuses the fixed seed listing (keyed
 * on external_url) and only creates what is missing, so it is safe to call
 * before every feed test.
 */
export async function ensureSeededScrollerImages(): Promise<void> {
  const config = getEnrichmentDbConfig();
  const { baseUrl, headers } = config;

  const lookup = await fetch(
    `${baseUrl}/api/listings/external_url/?external_url=${encodeURIComponent(SEED_EXTERNAL_URL)}`,
    { headers },
  );

  if (lookup.ok) {
    await ensureListingHasImages(config, await lookup.json());
    return;
  }

  if (lookup.status !== 404) {
    throw new Error(`Failed to look up seed listing (${await readError(lookup)})`);
  }

  const estateAgentId = await getOrCreateEstateAgent(config);
  const createListing = await fetch(`${baseUrl}/api/listings/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      estate_agent_id: estateAgentId,
      external_url: SEED_EXTERNAL_URL,
      original_listing_id: SEED_ORIGINAL_LISTING_ID,
      title: 'E2E Seed Listing',
      is_active: true,
    }),
  });
  if (!createListing.ok) {
    throw new Error(`Failed to create seed listing (${await readError(createListing)})`);
  }

  await ensureListingHasImages(config, await createListing.json());
}

// --- Detail-page seed (FE-3 / PRO-255) -------------------------------------
//
// The detail-page e2e needs a listing that is fully renderable on /listing/[id]:
// a price, a short_description, feature tags and at least one image. Keep it in a
// dedicated seed (its own external_url and image-id space) so it neither depends
// on nor disturbs the feed seed above.

const DETAIL_SEED_EXTERNAL_URL = 'https://e2e.seed.local/scroller-detail-listing';
const DETAIL_SEED_ORIGINAL_LISTING_ID = 990000050;
const DETAIL_IMAGE_SPACE: SeedImageSpace = {
  originalImageIdBase: 990000050,
  urlPrefix: 'https://e2e.seed.local/scroller-detail-image',
};

// The renderable core fields the detail page binds to. Applied idempotently so a
// pre-existing or partially-seeded listing converges to the same content.
const DETAIL_SEED_FIELDS = {
  title: 'E2E Detail Seed Listing',
  short_description: 'Bright and modern apartment with a private garden.',
  price: 450000,
  bedrooms: 2,
  bathrooms: 1,
  property_tags: 'Garden, Modern',
} as const;

/**
 * Ensure a fully-renderable detail listing exists and return its enrichment-db
 * id (the id the detail route is keyed on). Idempotent: reuses the fixed seed
 * listing (keyed on external_url), refreshes its core fields, and tops up its
 * images, so it is safe to call before every detail e2e run.
 */
export async function ensureSeededDetailListing(): Promise<{ id: number }> {
  const config = getEnrichmentDbConfig();
  const { baseUrl, headers } = config;

  const lookup = await fetch(
    `${baseUrl}/api/listings/external_url/?external_url=${encodeURIComponent(DETAIL_SEED_EXTERNAL_URL)}`,
    { headers },
  );

  let listing: { id: number; images?: Array<{ image_data?: string | null }> };
  if (lookup.ok) {
    listing = await lookup.json();
  } else if (lookup.status === 404) {
    const estateAgentId = await getOrCreateEstateAgent(config);
    const createListing = await fetch(`${baseUrl}/api/listings/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        estate_agent_id: estateAgentId,
        external_url: DETAIL_SEED_EXTERNAL_URL,
        original_listing_id: DETAIL_SEED_ORIGINAL_LISTING_ID,
        is_active: true,
        ...DETAIL_SEED_FIELDS,
      }),
    });
    if (!createListing.ok) {
      throw new Error(`Failed to create detail seed listing (${await readError(createListing)})`);
    }
    listing = await createListing.json();
  } else {
    throw new Error(`Failed to look up detail seed listing (${await readError(lookup)})`);
  }

  // Refresh the core fields (scalar-only PUT leaves images untouched) so a
  // listing seeded by an earlier run still has the fields the detail page reads.
  const update = await fetch(`${baseUrl}/api/listings/${listing.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(DETAIL_SEED_FIELDS),
  });
  if (!update.ok) {
    throw new Error(`Failed to set detail seed fields (${await readError(update)})`);
  }

  await ensureListingHasImages(config, listing, DETAIL_IMAGE_SPACE);
  return { id: listing.id };
}
