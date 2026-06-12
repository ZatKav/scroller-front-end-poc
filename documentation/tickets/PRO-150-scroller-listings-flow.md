# PRO-150-scroller-listings-flow

## Ticket Snapshot

- Identifier: PRO-150
- Title: Scroller listings flow
- URL: https://linear.app/property-app/issue/PRO-150/scroller-listings-flow
- Branch: PRO-150-scroller-listings-flow

## Source Requirements

### Description

Implement a protected listing-flow route as `/(protected)/listings` because `/scroller` is the deployed
base path. `/scroller/listings` should load the listing stack-rank queue and immediately show the first
listing, then use `/scroller/listings/{listing_id}` as the customer advances.

### Key Comments and Acceptance Criteria

- Preserve the existing singular `/listing/[id]` standalone detail route.
- Add plural `/listings` and `/listings/[id]` flow routes that remain base-path-relative.
- Load the authenticated customer's listing stack-rank queue from the PRO-152 BFF/API dependency.
- Render listing detail content through the existing listing detail view path.
- Expose `Skip`, `Like`, and `Next`; persist only `Skip` and `Like` using the listing action contract.
- Show an in-flow terminal state when there are no more listings.
- Preserve protected-route behavior for unauthenticated visitors through the existing protected layout.

## Architecture Impact

- Adds a client-side listing-flow surface in `src/components/ListingFlow.tsx` that composes existing
  listing detail rendering with the PRO-151 listing queue helpers.
- Adds App Router entries at `src/app/(protected)/listings/page.tsx` and
  `src/app/(protected)/listings/[id]/page.tsx`.
- Keeps base-path handling split by boundary: source routes stay `/listings...` for Next navigation,
  while browser fetches use `appPath()` for the internal `/api/listings/stack-rank` request.
- Extends the shared scroller customer interactions DB browser client with typed listing interaction
  methods that reuse the existing server-side proxy.

## Functional Changes

- Opening `/listings` loads the listing stack-rank queue, renders the first listing, and replaces the
  browser URL with `/listings/{listing_id}`.
- Opening `/listings/{listing_id}` server-renders that listing first, then hydrates the queue for
  subsequent ranked listings.
- `Skip` records `action: 0` against `/customer-listing-interactions` and advances.
- `Like` records `action: 1` against `/customer-listing-interactions` and advances.
- `Next` advances the queue without recording a preference.
- The flow shows `No more listings` when the queue is exhausted.

## Validation

- `npm test -- --runTestsByPath src/components/ListingFlow.test.tsx src/components/ListingDetailContent.test.tsx src/app/shared/clients/scroller-customer-interactions-db-api-client.test.ts src/app/'(protected)'/listings/page.test.tsx src/app/'(protected)'/listings/'[id]'/page.test.tsx`: passed, 5 suites / 35 tests.
- `npm test`: passed, 26 suites / 236 tests. Existing older tests still emit console warnings/noisy error-path logs.
- `npm run build`: passed and listed `/listings` plus `/listings/[id]`; first attempt exposed the missing client boundary on the new plural route error file and was fixed.
- `npm run test:e2e:ci -- --list`: passed, 6 Chromium specs listed.
- `npx tsc --noEmit`: still fails on pre-existing jest-dom matcher typings in `ImageScroller.test.tsx` and `ListingImageCarousel.test.tsx`, plus existing Playwright `Response` typings in `tests/login.spec.ts`; no PRO-150 files appear in the failure output.
- `npm run lint`: blocked by the repo's existing interactive Next ESLint setup prompt.

## Changed Files

- `README.md`: Documented the active protected listing flow, listing interaction persistence, and route structure.
- `documentation/tickets/PRO-150-scroller-listings-flow.md`: Ticket implementation artifact.
- `scroller-front-end-poc/src/app/(protected)/listings/page.tsx`: Added the protected listing-flow entry route.
- `scroller-front-end-poc/src/app/(protected)/listings/[id]/page.tsx`: Added direct listing-flow navigation with existing detail fetch/not-found handling.
- `scroller-front-end-poc/src/app/(protected)/listings/[id]/loading.tsx`: Reused the standalone listing detail loading state.
- `scroller-front-end-poc/src/app/(protected)/listings/[id]/error.tsx`: Reused the standalone listing detail error boundary with an explicit client boundary.
- `scroller-front-end-poc/src/app/(protected)/listings/[id]/not-found.tsx`: Reused the standalone listing detail not-found state.
- `scroller-front-end-poc/src/components/ListingFlow.tsx`: Added queue loading, URL replacement, Skip/Like persistence, Next advancement, and terminal state behavior.
- `scroller-front-end-poc/src/components/ListingFlow.test.tsx`: Added listing-flow route, queue, action, and terminal state coverage.
- `scroller-front-end-poc/src/components/ListingDetailContent.tsx`: Added an optional footer slot so flow controls render inside the listing detail layout.
- `scroller-front-end-poc/src/app/(protected)/listings/page.test.tsx`: Added plural route smoke coverage.
- `scroller-front-end-poc/src/app/(protected)/listings/[id]/page.test.tsx`: Added direct navigation, malformed id, and upstream error coverage.
- `scroller-front-end-poc/src/app/shared/clients/scroller-customer-interactions-db-api-client.ts`: Added typed listing interaction read/create/delete methods.
- `scroller-front-end-poc/src/app/shared/clients/scroller-customer-interactions-db-api-client.test.ts`: Added listing interaction client coverage.
- `scroller-front-end-poc/src/types/scroller-customer-interactions-db.ts`: Added listing interaction request/response types.
