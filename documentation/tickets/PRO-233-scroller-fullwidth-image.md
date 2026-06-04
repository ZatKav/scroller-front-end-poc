# PRO-233: Remove scroller title from front end and resize images to fit screen size

## Summary
On mobile the scroller wasted vertical space on a per-page `<h1>Scroller</h1>` title
and a `60vh`-capped image. This change removes the title entirely and makes the
property image the dominant element: the image now spans the full available width
(`w-full`) with `object-contain` preserving its aspect ratio and a `max-h-[70vh]`
cap so the Skip/Like buttons stay visible without scrolling. The left and right
halves of the image are now Skip/Like tap zones (transparent, `aria-hidden`,
non-focusable overlay buttons) that mirror the explicit Skip/Like buttons for fast
thumb interaction; the explicit buttons are retained for discoverability and
keyboard/assistive-tech users. The debug readout (image-summary + stack-rank-weights)
is kept but now naturally falls below the fold beneath the enlarged image and buttons.
View-duration tracking, queue advance/prefetch, empty/loading/error states, and reset
controls are unchanged. New render order:
image (with left=Skip / right=Like tap zones) → Skip/Like buttons → 2-column readout
[ image-summary | weights ] → reset controls.

## Changes
- `src/app/(protected)/page.tsx`:
  - Removed the `<h1 className="text-3xl font-bold text-gray-900 mb-8">Scroller</h1>`.
  - Changed the `<main>` layout from vertically-centered `justify-center ... p-4` to
    top-aligned `px-2 py-4` (dropped `justify-center`) so the image + buttons occupy the
    initial viewport and the readout falls below the fold.
- `src/components/ImageScroller.tsx`:
  - Wrapped the `<img>` in a `relative w-full` container; changed image classes from
    `max-w-full max-h-[60vh] ... object-contain` to `w-full max-h-[70vh] ... object-contain`.
  - Added two transparent overlay `<button>`s inside the wrapper: left half
    (`data-testid="image-skip-zone"`) → `handleAction(0)`, right half
    (`data-testid="image-like-zone"`) → `handleAction(1)`. Both are `aria-hidden="true"`,
    `tabIndex={-1}`, and `disabled` while `submitting`, so they don't duplicate the
    labelled buttons in the accessibility tree or allow double submissions.
  - Kept the explicit Skip/Like buttons and the debug readout / reset controls as-is.
- `src/components/ImageScroller.test.tsx`:
  - `beforeEach` now re-applies the resolved default to `createInteraction`
    (`mockResolvedValue({})`) — a prior test installs a never-resolving implementation on
    the shared mock that otherwise leaks into later tests.
  - Added `image sizing` describe: image uses `w-full` + `object-contain` + `max-h-[70vh]`
    and no longer the old `max-h-[60vh]`.
  - Added `image tap zones` describe: left zone records a skip and advances; right zone
    records a like and advances; zones are `aria-hidden` and do not surface as extra
    Skip/Like buttons; zones disable while an interaction is in flight.
- `tests/helpers/login.ts` and `tests/login.spec.ts`:
  - Replaced the `getByRole('heading', { name: 'Scroller' })` readiness assertions with
    `getByTestId('scroller-image')` (the title is gone; the image is the stable
    authenticated-render signal). Updated accompanying comments that referenced "heading".

## Tests
- Ran: `make test-dashboard-unit` (jest) in `scroller-front-end-poc`.
- Result: pass — 84/84 tests across 10 suites (was 79; +5 new sizing/tap-zone/a11y tests).
- E2E (`make test-dashboard-e2e`, Playwright): NOT run in this environment. The suite
  logs in and renders real stack-rank images, requiring the scroller-customer-interactions-db
  backend on :8400 (not listening here) plus an API key and login credentials. The e2e
  changes are mechanical locator swaps to the pre-existing `scroller-image` test id and
  were reviewed for coherence.
- Note: ESLint is not configured for non-interactive runs in this repo (it prompts for
  interactive setup), so jest is the working gate, consistent with prior tickets.

## Documentation updated
- `documentation/tickets/PRO-233-scroller-fullwidth-image.md`: this snapshot.
- No living architecture/functional doc exists for the component (documentation is
  per-ticket snapshots), so none was changed.

## Open questions
- None. Image fit uses `object-contain` (no crop) and a `max-h-[70vh]` cap per the refined
  plan; the debug readout is retained below the fold (not removed/hidden) per the approved
  refinement.
