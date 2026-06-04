# PRO-226: Scroller "No more images" recovery (front-end)

## Summary
The scroller permanently latched the terminal "No more images" state after a
single continuation fetch returned no new images. `loadMoreImages` set a
session-scoped `noMoreImagesRef` that then short-circuited every future refill
(in `loadMoreImages`, `handleAdvance`, and `initializeQueue`), so the customer
stayed stuck for the rest of the session even if more eligible images became
available. This change treats an empty continuation as transient: it still shows
the "No more images" message for the current state, but no longer blocks later
attempts, so the scroller recovers when it next reaches the prefetch threshold
and new images are available.

This is the front-end half of PRO-226; the backend candidate-pool pagination
root cause is fixed separately in `scroller-customer-interactions-db`.

## Changes
- `src/app/(protected)/page.tsx`:
  - Removed the permanent `noMoreImagesRef` latch. Refills are now gated only by
    the existing `refillInFlightRef` in-flight guard, which bounds re-attempts to
    one per advance (no tight refetch loop).
  - `loadMoreImages` sets `noMoreImages` to reflect the latest attempt only
    (`setNoMoreImages(addedCount === 0)`), clearing the terminal message as soon
    as a later attempt brings images in.
  - `handleAdvance` and `initializeQueue` no longer consult the removed latch;
    `handleAdvance` still respects the continuation-error guard and prefetch
    threshold, and `initializeQueue` still skips the continuation when the
    initial load returned nothing.
- `src/app/(protected)/page.test.tsx`:
  - Added a regression test: after a transient empty continuation, advancing
    again re-attempts the fetch and displays newly available images instead of
    remaining stuck on "No more images".
- `.woodpecker.yml`:
  - Fixed the `deploy-main` health check URL. The app is served under the
    `/scroller` base path (`NEXT_PUBLIC_BASE_PATH`), so the probed bare root
    `http://host.containers.internal:8410` returned 404 and failed the deploy
    even though the pod was healthy. Point it at
    `http://host.containers.internal:8410/scroller/login` (matches the Makefile
    default, renders without auth). Pre-existing deploy-config bug surfaced while
    merging this branch; unrelated to the page-level change.
  - After the health check, warm `/scroller/` and `/scroller/api/auth/me`
    (non-fatal curls). The post-deploy smoke's first authenticated hit triggers
    the client-side `/api/auth/me` check, and `AuthContext` bounces to `/login`
    if that call exceeds its 5s timeout — so a cold first hit could make the
    "Scroller" heading never render and flake the smoke. Pre-warming the routes
    the health check doesn't cover removes that race. Pre-existing readiness
    fragility, not the page-level change.

## Tests
- Ran: `npx jest` (equivalent to `make test-dashboard-unit`) in `scroller-front-end-poc`.
- Result: pass (70/70 across 10 suites). Existing terminal-empty, continuation-error,
  dedup, and preload tests remain green.

## Documentation updated
- `documentation/tickets/PRO-226-scroller-no-more-images-recovery.md`: this snapshot.
- No living architecture/functional doc exists for the page (documentation is
  per-ticket snapshots), so none was changed.

## Open questions
- After reaching the terminal screen and reset (PRO-227 added the reset control
  there), there is still no explicit "refetch on reset" trigger; PRO-227 flagged
  refetch/restart-after-reset as a separate follow-up. This change enables such a
  refill to succeed (the latch no longer blocks it) but does not wire the reset
  button to a refetch.
