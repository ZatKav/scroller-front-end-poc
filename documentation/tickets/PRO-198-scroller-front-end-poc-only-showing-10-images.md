# PRO-198-scroller-front-end-poc-only-showing-10-images

## Ticket Snapshot

- Identifier: PRO-198
- Title: Scroller-front-end-poc only showing 10 images
- URL: https://linear.app/property-app/issue/PRO-198/scroller-front-end-poc-only-showing-10-images
- Branch: PRO-198-scroller-front-end-poc-only-showing-10-images

## Source Requirements

### Description

The protected scroller stopped after a finite startup sequence and could show `No more images` even when additional unseen customer images should have been available. The ticket requires customer-aware continuation, preserving first-image latency, preventing premature terminal empty state, and retaining buffered cards on continuation failures.

### Key Comments and Acceptance Criteria

- Continue loading unseen ranked images after the customer consumes the currently loaded queue.
- Do not show `No more images` while additional unseen cards may still be retrievable.
- Use authenticated customer identity for continuation requests so prior interactions exclude seen cards.
- Keep first-image fast path (render first card before larger follow-up loads complete).
- If no additional unseen cards exist, show terminal `No more images`.
- If continuation fails, keep already loaded cards and show `More images could not be loaded.`.

## Architecture Impact

- `src/lib/stack-rank-client.ts` now supports customer-aware upstream reads by sending `customer_id` + `limit` (omitting legacy `skip` when customer-aware mode is active).
- `src/app/api/stack-rank/route.ts` now resolves authenticated user id and calls upstream in customer-aware mode; per-user ordinal session replay is bypassed for continuation correctness.
- `src/app/(protected)/page.tsx` now manages a browser-side continuation queue with in-flight guard, terminal no-more detection, append-by-id dedupe, and near-end prefetch trigger.
- `src/components/ImageScroller.tsx` now renders a loading-empty state when queue exhaustion happens during in-flight continuation, and only renders terminal empty state when parent signals no more cards or continuation has failed.

## Functional Changes

- Protected page now performs initial `limit=1` fetch followed by continuation preloads with `limit=10`.
- Continuation fetches are triggered when the queue is nearly exhausted, and newly returned images are deduplicated by `id` before append.
- Terminal empty state is deferred until upstream returns no new renderable images.
- Continuation errors preserve existing queue order and show deterministic failure text.
- Stack-rank API route now uses authenticated `customer_id` for upstream card selection.

## Validation

- `npm test -- --runTestsByPath src/lib/stack-rank-client.test.ts src/app/api/stack-rank/route.test.ts src/components/ImageScroller.test.tsx 'src/app/(protected)/page.test.tsx'`

### CI Follow-Up

- CI failure evidence: `tests/login.spec.ts` timed out waiting for `/api/stack-rank?skip=0&limit=1` and `/api/stack-rank?skip=1&limit=3` responses.
- Root cause: PRO-198 changed the protected page to customer-aware continuation (`limit=1`, then `limit=10`) and no longer emits legacy `skip` windows.
- Fix: update the Playwright pre-deploy smoke test to wait for the current `limit=1` first-card response and `limit=10` continuation response.

### Second CI Follow-Up

- CI failure evidence: the updated `tests/login.spec.ts` still timed out in `page.waitForResponse` even when the captured page snapshot showed the scroller image and Like/Skip controls were already visible.
- Root cause: the smoke test coupled success to Playwright network-response observation rather than the user-visible scroller state and persisted Like/Skip behavior.
- Fix: remove stack-rank response waits from the smoke test, extend the test budget to 60 seconds, and wait on visible scroller images before recording Like and Skip interactions.

## Changed Files

- `scroller-front-end-poc/src/lib/stack-rank-client.ts`: added customer-aware query support (`customer_id` + `limit`, legacy fallback).
- `scroller-front-end-poc/src/lib/stack-rank-client.test.ts`: added customer-aware and legacy-query coverage.
- `scroller-front-end-poc/src/app/api/stack-rank/route.ts`: switched to authenticated customer-aware upstream reads and removed session-window replay.
- `scroller-front-end-poc/src/app/api/stack-rank/route.test.ts`: updated assertions for customer-aware routing, limit normalization, and failure handling.
- `scroller-front-end-poc/src/app/(protected)/page.tsx`: replaced fixed window loader with continuation queue manager and terminal/no-more signaling.
- `scroller-front-end-poc/src/app/(protected)/page.test.tsx`: added continuation success, terminal empty, failure retention, dedupe, and first-image-latency coverage.
- `scroller-front-end-poc/src/components/ImageScroller.tsx`: added loading-empty-state behavior while continuation is still expected.
- `scroller-front-end-poc/src/components/ImageScroller.test.tsx`: added loading-vs-terminal empty-state coverage.
- `scroller-front-end-poc/tests/login.spec.ts`: updated CI readiness waits for customer-aware continuation requests; then removed brittle stack-rank response waits in favor of visible scroller readiness and persisted Like/Skip verification.
- `README.md`: updated behavior docs for customer-aware continuation and terminal state semantics.
