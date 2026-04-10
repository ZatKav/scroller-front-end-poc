# PRO-193-extend-the-front-end-cache-to-always-have-ten-images-waiting

## Ticket Snapshot

- Identifier: PRO-193
- Title: Extend the front end cache to always have ten images waiting
- URL: https://linear.app/property-app/issue/PRO-193/extend-the-front-end-cache-to-always-have-ten-images-waiting
- Branch: PRO-193-extend-the-front-end-cache-to-always-have-ten-images-waiting

## Source Requirements

### Description

Keep the existing warm start that loads stack-rank windows of 1, then 3, then 10 images after login. Once the locally buffered queue falls to 10 remaining cards, start a staged refill of the next 3 ranked cards and then the next 7, without blocking the current card. Preserve ranked order, never append duplicates, and show a short failure message if a refill stage fails while leaving the current queue usable.

### Key Comments and Acceptance Criteria

- Count the currently visible card as part of the remaining local queue.
- Trigger the refill only when the local queue falls to 10 remaining cards after a successful card advance.
- Request refill windows in order as `skip=14&limit=3`, then `skip=17&limit=7`, and repeat from the next upstream cursor on later thresholds.
- Keep the current card actionable while refill requests are in flight.
- Append only unseen cards in ranked order and keep already buffered cards available if one refill stage fails.

## Architecture Impact

- The protected page now owns queue progress tracking by receiving card-advance callbacks from `ImageScroller`.
- The page keeps a next upstream `skip` cursor in sync with staged refill windows so later threshold hits continue from the correct ranked position.
- Refill work stays on the existing internal `/api/stack-rank` route; no backend or route contract changes were required.
- README documentation now explains the staged refill behavior alongside the existing warm-start flow.

## Functional Changes

- After the initial `1 + 3 + 10` warm start, the page starts a background refill of `+3` then `+7` cards whenever the visible queue drops to 10 remaining cards.
- Like/Skip interactions still advance immediately, and the parent callback only fires after a successful interaction POST.
- Refill failures surface `More images could not be loaded.` without clearing the active queue or already appended refill cards.
- Refill appends dedupe by image ID before merging into the local queue.

## Validation

- `node /Users/giacomokavanagh/github/finder/scroller-front-end-poc/scroller-front-end-poc/node_modules/jest/bin/jest.js --passWithNoTests --runTestsByPath 'src/app/(protected)/page.test.tsx' 'src/components/ImageScroller.test.tsx'` passed: 2 suites, 16 tests.
- `node /Users/giacomokavanagh/github/finder/scroller-front-end-poc/scroller-front-end-poc/node_modules/typescript/bin/tsc --noEmit` still fails on the repo's existing jest-dom matcher typing gap in `src/components/ImageScroller.test.tsx`.

## Changed Files

- `scroller-front-end-poc/src/app/(protected)/page.tsx`: Added parent-owned advance tracking, the staged refill trigger, and sequential `+3` then `+7` window loading with failure messaging.
- `scroller-front-end-poc/src/app/(protected)/page.test.tsx`: Added staged refill sequencing, duplicate-append protection, and refill-failure coverage.
- `scroller-front-end-poc/src/components/ImageScroller.tsx`: Added the optional parent advance callback after successful interaction submission.
- `scroller-front-end-poc/src/components/ImageScroller.test.tsx`: Added callback coverage and kept failure behavior assertions around unsuccessful POSTs.
- `README.md`: Documented the refill-at-10 behavior alongside the existing warm-start queue.
