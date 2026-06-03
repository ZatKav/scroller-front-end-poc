# PRO-221: Add stack rank weights to scroller-front-end-poc page (frontend)

## Summary
Rendered the stack-rank algorithm weights as raw JSON under the image on the protected scroller page so they can be observed updating in real time. Below the existing image summary, `ImageScroller` now shows a `<pre>` JSON block containing the per-customer `profile_weights` map and the current card's per-image `final_score`/`selection_reason`. The weights come from the new `/api/stack-rank` envelope (`{ images, profile_weights }`) and refresh per batch fetch. This is the frontend half of PRO-221; the API that exposes the weights is the `scroller-customer-interactions-db` PR.

> Note: this branch was rebased onto the latest `origin/main` (which had merged PRO-198's customer-aware scroller continuation). The weights feature is implemented on top of PRO-198's `fetchStackRankBatch`/`loadMoreImages` scroller, not the earlier window-based one. The intentional `users.json` password update was landed directly on `main` and is no longer part of this PR's diff.

## Changes
- `src/types/scroller-customer-interactions-db.ts`: added optional `final_score`/`selection_reason` to `StackRankImage`; added `StackRankProfileWeights` and `StackRankResponse` types.
- `src/lib/stack-rank-client.ts`: added `fetchStackRank(...)` returning the `{ images, profile_weights }` envelope (defaulting both when omitted); `fetchStackRankImages(...)` now delegates to it and returns just the cards (keeps the customer-aware / legacy-skip query behaviour).
- `src/app/api/stack-rank/route.ts`: calls `fetchStackRank`, still filters null `image_data`, and now passes `profile_weights` through in the `{ ok, images, profile_weights }` response.
- `src/app/(protected)/page.tsx`: `fetchStackRankBatch` returns images + `profileWeights`; the page holds the latest `profileWeights` in state (updated on each batch/continuation fetch) and passes it to `ImageScroller`.
- `src/components/ImageScroller.tsx`: added optional `profileWeights` prop; renders a `data-testid="stack-rank-weights"` `<pre>` raw-JSON block under the image summary showing `profile_weights` and the current card's `final_score`/`selection_reason` (null when absent).
- Tests: extended `stack-rank-client.test.ts` (envelope parsing + defaults), updated `route.test.ts` to mock `fetchStackRank` and assert `profile_weights` passthrough, added `ImageScroller.test.tsx` cases for the raw-JSON block and the cold-start empty case.
- `README.md`: documented the under-image weights display.

## Tests
- Ran: `npx jest` (equivalent to `npm test`) in `scroller-front-end-poc/scroller-front-end-poc`.
- Type check: `npx tsc --noEmit` reports no errors in production source; the only diagnostics are pre-existing jest-dom matcher (`toHaveAttribute`/`toBeInTheDocument`) noise in `*.test.tsx`, present on `main` and unrelated to this change.
- `next lint` is not configured in this repo (interactive setup prompt); not run.

## Documentation updated
- `README.md`: added the raw-JSON weights description to the scroller flow section.
- `documentation/tickets/PRO-221-stack-rank-weights-ui.md`: this snapshot.

## Open questions
- Refresh cadence is per batch fetch (decided during refinement): weights update roughly every ~10 swipes when a new continuation batch is requested, not on every individual like/skip.
