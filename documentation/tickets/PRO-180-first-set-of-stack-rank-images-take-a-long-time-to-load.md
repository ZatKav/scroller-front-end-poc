# PRO-180-first-set-of-stack-rank-images-take-a-long-time-to-load

## Ticket Snapshot

- Identifier: PRO-180
- Title: First set of stack rank images take a long time to load
- URL: https://linear.app/property-app/issue/PRO-180/first-set-of-stack-rank-images-take-a-long-time-to-load
- Branch: PRO-180-first-set-of-stack-rank-images-take-a-long-time-to-load

## Source Requirements

### Description

Load Scroller's ranked image queue progressively after login so the customer can see and act on the first ranked image before larger image batches finish. Use staged windows of first 1 image, then next 3, then next 10, while keeping backend keys behind authenticated internal routes.

### Key Comments and Acceptance Criteria

- Render the first ranked image as soon as the first window loads.
- Allow Like/Skip on the first image before the next-three and next-ten windows finish.
- Append later windows in ranked order without repeating images already present in the queue.
- If a later window fails, keep the current image visible and tell the customer more images could not be loaded.
- Do not expose finder-enrichment-db or backend service API keys to frontend browser code.

## Architecture Impact

- The protected page now performs staged reads against internal `/api/stack-rank` windows: `skip=0&limit=1`, `skip=1&limit=3`, and `skip=4&limit=10`.
- The Next.js `/api/stack-rank` route forwards `skip` and `limit` to `scroller-customer-interactions-db`, filters null `image_data`, and merges unique windows into the server-side stack-rank session.
- Browser code still calls only internal Next.js routes.

## Functional Changes

- The scroller mounts after the first image window and keeps its current index while later windows append to props.
- Later window failures set the message `More images could not be loaded.` without clearing the current queue.
- Both the server route and page append logic dedupe by image ID to avoid repeated queue entries.

## Validation

- `npm test -- --runTestsByPath src/lib/stack-rank-client.test.ts src/app/api/stack-rank/route.test.ts src/app/shared/clients/scroller-customer-interactions-db-api-client.test.ts 'src/app/(protected)/page.test.tsx'` passed: 4 suites, 19 tests.
- `npx tsc --noEmit` failed only on pre-existing `src/components/ImageScroller.test.tsx` jest-dom matcher type declarations.

## Changed Files

- `scroller-front-end-poc/src/app/(protected)/page.tsx`: Added staged stack-rank window loading, dedupe, and later-window failure messaging.
- `scroller-front-end-poc/src/app/(protected)/page.test.tsx`: Added progressive-render and later-window-failure coverage.
- `scroller-front-end-poc/src/app/api/stack-rank/route.ts`: Added query parsing, window forwarding, null filtering, and session merge.
- `scroller-front-end-poc/src/app/api/stack-rank/route.test.ts`: Added window and session merge coverage.
- `scroller-front-end-poc/src/lib/stack-rank-client.ts`: Added `skip`/`limit` query support.
- `scroller-front-end-poc/src/lib/stack-rank-client.test.ts`: Added stack-rank client query coverage.
- `scroller-front-end-poc/src/app/shared/clients/scroller-customer-interactions-db-api-client.ts`: Added window support to the shared interactions client.
- `scroller-front-end-poc/src/app/shared/clients/scroller-customer-interactions-db-api-client.test.ts`: Updated stack-rank client expectations and typed error assertions.
- `README.md`: Documented the progressive loading behavior.
