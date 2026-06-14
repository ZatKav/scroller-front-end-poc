# PRO-148-listings-entry-point

## Ticket Snapshot

- Identifier: PRO-148
- Title: Listings entry point
- URL: https://linear.app/property-app/issue/PRO-148/listings-entry-point
- Branch: PRO-148-listings-entry-point

## Source Requirements

### Description

Add "Show me something else" on the current `/scroller/listing/[id]` page, linking to
`/scroller/listings`. Add tests proving carousel left/right swipes only navigate images and never
trigger listing navigation or interactions.

### Key Comments and Acceptance Criteria

- The authenticated singular detail page should expose a visible entry point into the secondary
  listing discovery flow.
- The link should use source href `/listings` so Next applies `NEXT_PUBLIC_BASE_PATH=/scroller` in
  deployed environments.
- Keep the existing standalone `/listing/[id]` compatibility route working.
- Listing carousel left/right gestures should only change the current image, leave the browser on
  `/listing/{id}`, and create no customer image or listing interaction.
- No backend, schema, auth, or interaction API changes are required.

## Architecture Impact

- `ListingDetailContent` remains the shared presentational detail body for standalone details and
  the plural listing flow; it now includes the standalone-to-flow `next/link` entry point.
- Base-path handling stays at the framework boundary: the link href is `/listings`, while deployed
  routing resolves it under `/scroller`.
- `ListingImageCarousel` stays presentation-only. Regression coverage now guards against carousel
  swipes activating listing navigation or interaction clients.

## Functional Changes

- A user viewing `/listing/[id]` sees `Show me something else` below the listing description and can
  navigate into `/listings`.
- Left and right carousel swipes continue to move between images within the same listing only.
- Carousel swipes do not call customer image interaction or customer listing interaction clients.
- Playwright detail-page coverage verifies the new link and URL stability during carousel swipes.

## Validation

- `npm test -- --runTestsByPath src/components/ListingDetailContent.test.tsx src/components/ListingImageCarousel.test.tsx`: passed, 2 suites / 25 tests.
- `npm test`: passed, 26 suites / 243 tests, with pre-existing console noise from older API/ImageScroller tests.
- `npm run build`: passed and listed `/listing/[id]`, `/listings`, and `/listings/[id]`.
- `npm run test:e2e:ci -- --list tests/listing-detail.spec.ts`: passed and listed the three Chromium listing-detail tests.
- `npm run test:e2e:ci -- tests/listing-detail.spec.ts`: blocked locally because `gvproxy` already held port `8410`, so Playwright could not start the configured dev server.
- `npx tsc --noEmit`: still fails on pre-existing Jest DOM matcher typings in component tests and existing Playwright `Response` typings in `tests/login.spec.ts`.
- `npm run lint`: still blocked by Next's interactive ESLint setup prompt.
- `git diff --check`: passed.

## Changed Files

- `README.md`: Documented the standalone detail route entry point into the listing flow.
- `documentation/tickets/PRO-148-listings-entry-point.md`: Ticket implementation artifact.
- `scroller-front-end-poc/src/components/ListingDetailContent.tsx`: Added the base-path-safe
  `Show me something else` link.
- `scroller-front-end-poc/src/components/ListingDetailContent.test.tsx`: Covered the new link href.
- `scroller-front-end-poc/src/components/ListingImageCarousel.test.tsx`: Added negative assertions
  that swipes stay local and create no interactions.
- `scroller-front-end-poc/tests/listing-detail.spec.ts`: Added browser-level link and swipe URL
  regression coverage.
