# PRO-151-listing-stack-rank-session-queue

## Ticket Snapshot

- Identifier: PRO-151
- Title: listing stack-rank session queue
- URL: https://linear.app/property-app/issue/PRO-151/listing-stack-rank-session-queue
- Branch: PRO-151-listing-stack-rank-session-queue

## Source Requirements

### Description

Add authenticated `/api/listings/stack-rank` BFF route, TypeScript types/client support, and listing queue state. Keep the current listing plus the next three listings preloaded. Deduplicate by listing id. Handle empty and error states. Full secondary-feed presentation remains deferred to PRO-149.

### Key Comments and Acceptance Criteria

- The BFF route must use the signed-in customer as `customer_id` and keep upstream credentials server-side.
- The queue must preserve ranked order while deduplicating by `listing.id`.
- The queue contract must expose empty state without a current listing id.
- A later preload failure must preserve any existing current listing and report the failure for the later UI consumer.
- Existing `/api/stack-rank`, `ImageScroller`, image interactions, and primary feed behavior must remain unchanged.

## Architecture Impact

- Added `GET /api/listings/stack-rank` under the existing Next.js API route boundary. It mirrors the authenticated stack-rank/image BFF pattern: local `auth-token` verification first, then a server-only upstream call with the authenticated user id.
- Extended `src/lib/stack-rank-client.ts` with `fetchListingStackRank()`, which calls `scroller-customer-interactions-db` at `/api/listings/stack-rank` using server-side environment credentials.
- Added `src/lib/listing-stack-rank-queue.ts` as a pure queue/state contract for PRO-149. It keeps one current listing, up to three preloaded listings, all deduplicated ranked listings, profile weights, and stable empty/error state fields.

## Functional Changes

- Authenticated browser callers can request `/api/listings/stack-rank?limit=<n>` and receive `{ ok: true, listings, profile_weights }`; unauthenticated or invalid sessions receive 401 without an upstream call.
- The default BFF limit is 4, matching current plus next-three preload.
- Listing queue helpers deduplicate by `listing.id` and preserve the first occurrence to maintain ranked order.
- Empty responses produce `status: "empty"` and `currentListing: null`.
- Initial load failures produce an error queue; continuation failures keep existing listings/current listing and attach an error message.
- Existing image-stack-rank routes and primary image scroller code were not modified.

## Validation

- Passed: `npm test -- --runTestsByPath src/lib/stack-rank-client.test.ts src/lib/listing-stack-rank-queue.test.ts src/app/api/listings/stack-rank/route.test.ts`
- Passed: `npm test` (23 suites, 219 tests).
- Passed: `npm run build`; Next registered `/api/listings/stack-rank` as a dynamic route.
- Passed: `git diff --check`.
- Blocked by pre-existing repo setup: `npm run lint` opens the interactive Next ESLint setup prompt.
- Known pre-existing failure: `npx tsc --noEmit` reports jest-dom matcher typings in `ImageScroller.test.tsx`/`ListingImageCarousel.test.tsx` and Playwright `Response` typings in `tests/login.spec.ts`; no PRO-151 files appear in the failure list.

## Changed Files

- `README.md`: documented the secondary listing stack-rank BFF and queue boundary.
- `src/app/api/listings/stack-rank/route.ts`: authenticated listing stack-rank BFF route.
- `src/app/api/listings/stack-rank/route.test.ts`: route auth, success, limit, and error mapping coverage.
- `src/lib/stack-rank-client.ts`: server-side listing stack-rank upstream client.
- `src/lib/stack-rank-client.test.ts`: listing upstream client coverage.
- `src/lib/listing-stack-rank-queue.ts`: listing queue state and browser BFF helper contract.
- `src/lib/listing-stack-rank-queue.test.ts`: current-plus-three, dedupe, empty, and error-state coverage.
- `src/types/scroller-customer-interactions-db.ts`: typed listing stack-rank response envelope.
- `documentation/tickets/PRO-151-listing-stack-rank-session-queue.md`: implementation snapshot.
