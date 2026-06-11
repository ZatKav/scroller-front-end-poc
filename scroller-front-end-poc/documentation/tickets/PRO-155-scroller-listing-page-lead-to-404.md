# PRO-155-scroller-listing-page-lead-to-404

## Ticket Snapshot

- Identifier: PRO-155
- Title: Scroller Listing page lead to 404
- URL: https://linear.app/property-app/issue/PRO-155/scroller-listing-page-lead-to-404
- Branch: PRO-155-scroller-listing-page-lead-to-404

## Source Requirements

### Description

The "View listing" overlay link on scroller image cards produced `/scroller/scroller/listing/<id>` under the deployed `/scroller` base path. The component passed an `appPath('/listing/<id>')` result into Next.js `Link`, and `Link` then applied the configured base path again.

### Key Comments and Acceptance Criteria

- The view-listing overlay must navigate to the listing detail route for the card's enrichment-db listing id without producing a 404.
- The link must resolve correctly when the app is served at root and when `NEXT_PUBLIC_BASE_PATH=/scroller`.
- The base path must appear exactly once in the resulting browser URL.
- The component must pass a base-path-relative href to `Link` and must not call `appPath()` for this Next-managed navigation.
- Regression coverage must exercise the configured-base-path case.

## Architecture Impact

- `ImageScroller` continues to own the card overlay link and still delegates navigation to Next.js `Link`.
- `appPath()` remains available for browser fetches, API-client URLs, and absolute navigations that Next does not auto-prefix.
- No backend, API, data contract, routing structure, or deployment configuration changed.

## Functional Changes

- The view-listing overlay now passes `/listing/<listing_id>` directly to `Link`.
- Under `NEXT_PUBLIC_BASE_PATH=/scroller`, Next.js applies the base path once, yielding `/scroller/listing/<listing_id>` instead of `/scroller/scroller/listing/<listing_id>`.
- The existing no-listing-id, null-listing-id, immersive-view, and no-interaction-recording behaviours are unchanged.

## Validation

- `npm test -- ImageScroller.test.tsx --runInBand`: passed, 1 suite / 62 tests.
- `npm test -- --runInBand`: passed, 21 suites / 201 tests. Existing tests still emit React `act(...)` and expected error-path console output, but there were no failures.
- `npm run build`: passed. The production route list includes dynamic `/listing/[id]`.
- `npm run test:e2e:ci -- --list`: passed, listing 6 Chromium specs including `view-listing.spec.ts`.
- Live Playwright navigation was not run locally because it depends on the seeded backend services and credentials.

## Changed Files

- `src/components/ImageScroller.tsx`: removed `appPath()` from the view-listing `Link` href.
- `src/components/ImageScroller.test.tsx`: added base-path regression coverage for the view-listing href.
- `documentation/tickets/PRO-155-scroller-listing-page-lead-to-404.md`: captured implementation context and validation evidence.
- `documentation/tickets/PRO-256-fe-5-view-listing-button.md`: corrected the previous link-path documentation.
