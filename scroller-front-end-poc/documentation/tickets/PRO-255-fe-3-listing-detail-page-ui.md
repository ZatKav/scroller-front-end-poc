# PRO-255: [FE-3] Implement listing detail page UI and tests

## Summary

Replaced the `/listing/[id]` placeholder scaffold with the real detail page,
rendered server-side from the enrichment-db `ListingDetail` payload (EDB-2). A
pure mapper turns the payload into a presentational view-model — formatted GBP
price, ordered carousel images (primary first, then `position`), a single-line
location, `Garden`/`New` feature tags, and the `short_description` blurb — and
the page hides any field that has no data so a sparse listing never leaves empty
chrome. All derivation is unit-tested in isolation; the page wiring, the
presentational component, and a Playwright detail render are covered too.

Per the refined plan, the FE-2 server client was repointed from
`/api/listings/{id}` to the `/api/listings/{id}/detail` endpoint (EDB-2): only
`/detail` returns images carrying `is_primary`/`position`, which the
"primary image first" ordering requires.

## Decisions (from refinement)

- **Blurb source** → harvested `short_description` (never `description_analysis`,
  which is a `json.dumps` string in the orchestrator).
- **`New` tag** → `first_seen` within **≤ 7 days** (`NEW_TAG_WINDOW_DAYS`).
- **Price** → hardcoded GBP `£`, thousands separators, no decimals; the contract
  has no currency field.

## Data load approach

The page is a server component already protected by the `(protected)` layout, so
it calls the server-only `fetchListingDetail` directly (the same client the BFF
route uses) rather than re-fetching its own `/api/listings/[id]` route over HTTP.
An upstream 404 renders the route's `not-found`; any other failure bubbles to the
route's `error` boundary. The BFF route remains for client-side callers.

## Changes

- `src/types/enrichment-db.ts`: firmed the loose `ListingDetail` into the typed
  fields the page reads (`ListingDetail`, `ListingDetailImage`,
  `ListingDetailLocation`, `ListingDetailAddress`); every field beyond `id` stays
  optional/nullable.
- `src/lib/listing-detail-view.ts` (new): `ListingDetailView` + pure helpers
  `formatPrice`, `isNew`, `deriveTags`, `formatLocation`, `toCarouselImages`, and
  the `mapListingToView` mapper.
- `src/lib/enrichment-db-client.ts`: repointed `fetchListingDetail` to the
  `/detail` endpoint.
- `src/components/ListingDetailContent.tsx` (new): presentational detail body —
  carousel, title, price, feature pills, beds/baths stats, location, description;
  each section omitted when its value is null/empty.
- `src/app/(protected)/listing/[id]/page.tsx`: fetch → map → render; keeps
  `parseListingId` + `notFound()`; 404 → `notFound`, other errors rethrown.
- `src/lib/listing-detail-view.test.ts` (new): helper + mapper unit tests
  (price formatting, recency window incl. boundary, Garden/New derivation,
  location join, image ordering/filtering/alt fallback, full + sparse mapping).
- `src/components/ListingDetailContent.test.tsx` (new): RTL render tests
  (full render, hidden empty fields, omitted stats/tags blocks, carousel empty
  state).
- `src/app/(protected)/listing/[id]/page.test.tsx`: rewritten from the scaffold
  test to cover render, malformed ids (incl. unsafe-integer overflow), upstream
  404 → not-found, and non-404 rethrow.
- `src/lib/enrichment-db-client.test.ts`: updated URL assertions to `/detail`.
- `tests/helpers/enrichment-db.ts`: parameterised the image seeders with a
  per-seed id space and added `ensureSeededDetailListing()` (own external_url +
  image-id space; idempotent; returns the enrichment-db id) for the detail e2e.
  Also added `deleteSeededDetailListing()` teardown, refactoring the PRO-257
  cleanup into a shared `deleteSeedListingByExternalUrl(externalUrl)` that both
  the feed and detail teardowns delegate to (best-effort; leaves the estate
  agent alone).
- `tests/listing-detail.spec.ts` (new): logs in, seeds a renderable listing,
  navigates to `/listing/{id}`, asserts the title, `£450,000` price, and a
  carousel image. A `test.afterAll` deletes the seeded detail listing so the
  shared enrichment-db is not left with leftover seed data (mirrors the feed
  spec's PRO-257 cleanup convention).

## Tests

- Ran: `npx jest` in `scroller-front-end-poc`.
- Result: PASS — 21 suites, 195 tests (was 18/142 before FE-2; new FE-3 work adds
  three suites: view helpers, content component, rewritten page).
- Ran: `npm run build` — PASS; `/listing/[id]` registered as a dynamic
  (server-rendered) route, types and lint clean.
- Ran: `npx playwright test --list tests/listing-detail.spec.ts` — the spec parses
  and registers across chromium/firefox/webkit.
- The full Playwright e2e is run in CI (it needs the app dev server, a login
  backend, and a configured `ENRICHMENT_DB_API_KEY` to seed). enrichment-db (8200)
  was reachable locally, but the app server and login backend were not wired up in
  this environment, so the e2e was not executed locally — consistent with FE-2.

## CI fix: e2e backend endpoints

The first CI run failed only on the new detail e2e: navigating to `/listing/{id}`
rendered the page's *correct* error states ("Listing not found" / "Listing could
not load"). That was the deployed enrichment-db predating EDB-2's `/detail`
route; it has since been redeployed and now serves `/api/listings/{id}/detail`.

An interim attempt switched the `test-e2e` backend base URLs to
`http://127.0.0.1:{port}`. That was wrong: the `test-e2e` step runs *inside* the
Playwright container, where `127.0.0.1` is the container's own loopback, so the
host-published `:8200`/`:8400` services were unreachable (`ECONNREFUSED`) from
both the seed helper and the BFF read. (The `127.0.0.1` form in
`scroller-customer-interactions-db`'s CI works there only because that pipeline
starts its services *inside* the test container.) Reverted to
`host.containers.internal`, the same alias the deploy/smoke steps already use for
`:8410`. Requires a CI run to confirm.

## Documentation updated

- `documentation/tickets/PRO-255-fe-3-listing-detail-page-ui.md`: this snapshot.
- `.woodpecker.yml`: `test-e2e` backend base URLs use `host.containers.internal`
  (see above).
- No `.env.example` change: FE-2 already documents `ENRICHMENT_DB_BASE_URL` /
  `ENRICHMENT_DB_API_KEY`, and FE-3 introduces no new env.

## Open questions

- None blocking. `floor_area_sqft` and the nearest-station line remain out of
  scope (EDB-4/EDB-5/ING-3 deferred) and are intentionally not rendered.
- `Garden` is a best-effort `/garden/i` substring match on free-text
  `property_tags`; revisit if a structured tag taxonomy lands.
