# PRO-149-listing-interactions-controls

## Ticket Snapshot

- Identifier: PRO-149
- Title: Listing interactions controls
- URL: https://linear.app/property-app/issue/PRO-149/listing-interactions-controls
- Branch: PRO-149-listing-interactions-controls

## Source Requirements

### Description

Add listing-level preference controls to the protected secondary listings flow while reusing the existing
listing detail UI and carousel.

### Key Comments and Acceptance Criteria

- Keep the listing flow on the existing `ListingDetailContent` and `ListingImageCarousel` rendering path.
- Show only `Skip` and `Like` controls for listing actions.
- Persist `Skip` as listing action `0` and `Like` as listing action `1` for the authenticated user.
- Add a bottom `Delete preferences` control that deletes only listing interactions and reloads the listing
  stack-rank queue.
- Preserve image interactions, the image feed controls, image reset behavior, and standalone `/listing/[id]`
  compatibility.

## Architecture Impact

- Updates `src/components/ListingFlow.tsx`, the client-side protected listings-flow surface introduced by
  PRO-150.
- Reuses the existing browser proxy client method
  `deleteCustomerListingInteractions(customerId)` instead of adding a new API route or exposing credentials.
- Keeps stack-rank reloads on the existing authenticated `GET /api/listings/stack-rank` BFF route.

## Functional Changes

- `Skip` records a listing interaction with `action: 0` and advances to the next queued listing.
- `Like` records a listing interaction with `action: 1` and advances to the next queued listing.
- `Delete preferences` calls the listing-interactions delete endpoint for the signed-in user, clears local
  listing queue state, reloads the first stack-rank window, and routes to the refreshed first listing.
- No image-interaction delete helper is called by the listing preferences reset.

## Validation

- `npm ci`: passed; installed dependencies from `package-lock.json`.
- `npm test -- --runTestsByPath src/components/ListingFlow.test.tsx`: passed, 1 suite / 5 tests.
- `npm test`: passed, 26 suites / 236 tests. Existing image scroller and carousel tests still emit noisy
  React `act(...)` warnings.
- `npm run build`: passed and listed `/listings` plus `/listings/[id]`.
- `npm run test:e2e:ci -- --list`: passed, 6 Chromium specs listed.
- `git diff --check`: passed.
- `npx tsc --noEmit`: still fails on pre-existing jest-dom matcher typings in `ImageScroller.test.tsx`
  and `ListingImageCarousel.test.tsx`, plus the existing Playwright `Response` typings in
  `tests/login.spec.ts`; no PRO-149 files appear in the failure output.

## Changed Files

- `README.md`: Documented listing preference deletion and clarified Skip/Like advancement.
- `documentation/tickets/PRO-149-listing-interactions-controls.md`: Ticket implementation artifact.
- `scroller-front-end-poc/src/components/ListingFlow.tsx`: Added listing-preference reset and kept the action row to Skip/Like only.
- `scroller-front-end-poc/src/components/ListingFlow.test.tsx`: Covered two-control rendering, Skip/Like persistence, advancement, terminal state, and listing-only reset.
