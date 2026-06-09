# PRO-250: [SCI-1] Deferred expose listing_id on StackRankImage (front end)

## Summary
Front-end half of PRO-250 (SCI-1). The `scroller-customer-interactions-db` API now returns `listing_id` on stack-rank image cards; this change updates the scroller front-end `StackRankImage` TypeScript type to accept the new field so cards can retain the listing id for later navigation work. The existing image scrolling experience is unchanged, and the "View listing" button (FE-5) remains deferred.

## Changes
- `src/types/scroller-customer-interactions-db.ts`: added `listing_id?: number | null` to the `StackRankImage` interface. Declared optional to match the existing optional response fields (`final_score?`, `selection_reason?`) and to avoid breaking the many existing card fixtures across the test suite.
- `src/app/shared/clients/scroller-customer-interactions-db-api-client.test.ts`: the stack-rank fetch fixture now includes `listing_id` so the passthrough is exercised.
- `src/app/(protected)/page.test.tsx`: `makeImage` fixture now sets `listing_id`.
- `src/lib/stack-rank-session.test.ts`: session fixtures now set `listing_id`.

## Tests
- Ran: `npx jest src/app src/lib/stack-rank-session.test.ts src/app/shared/clients/scroller-customer-interactions-db-api-client.test.ts src/components/ImageScroller.test.tsx`
- Result: all affected suites pass (e.g. `src/app` → 13 suites / 65 tests; `ImageScroller` → 56 tests; session + api-client + page fixtures pass). One cross-suite `userEvent` pointer flake was observed when running many suites together but does not reproduce when the suite runs alone.
- `npx tsc --noEmit`: no new type errors introduced — the error count matches the pre-existing baseline on `origin/main` (unrelated jest-dom / playwright type-setup errors).

## Documentation updated
- Tracked in the backend ticket snapshot and `documentation/tickets/listing-details-page-plan.md` (workspace root).

## Open questions
- None.
