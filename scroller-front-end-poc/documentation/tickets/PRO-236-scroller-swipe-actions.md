# PRO-236: Right and left swipe actions on scroller

## Summary
Adds mobile-friendly horizontal swipe gestures to the scroller image so a user
can swipe right to **Like** and swipe left to **Skip**, mirroring the existing
right/left tap zones and Skip/Like buttons. A swipe routes through the same
`handleAction(0 | 1)` path as every other control, so it records the identical
interaction payload (`customer_id`, `image_id`, `action`, `view_duration_ms`) and
triggers the same `onAdvance` continuation-load behaviour. Only deliberate,
mostly-horizontal gestures past a distance threshold are accepted, so ordinary
vertical mobile scrolling and short taps are never converted into an action. A
new synchronous in-flight guard prevents any double submission — including the
ghost click a browser fires on the underlying tap zone after a consumed swipe —
and the consumed swipe also calls `preventDefault()` to suppress that ghost click
outright. The existing buttons and aria-hidden tap zones are unchanged; no new
accessible controls are added and desktop behaviour is untouched.

## Changes
- `src/components/ImageScroller.tsx`:
  - Added `SWIPE_MIN_DISTANCE_PX` (60) and `SWIPE_HORIZONTAL_RATIO` (1.5)
    tuning constants for gesture acceptance.
  - Added `actionInFlightRef` (synchronous duplicate-submission guard) and
    `touchStartRef` (single-finger gesture start point) via `useRef`.
  - `handleAction` now returns early when `actionInFlightRef.current` is set,
    flips the ref synchronously on entry, and clears it in `finally`. This stops
    a second action firing in the same tick before `submitting`/`disabled` state
    has re-rendered.
  - Added `handleImageTouchStart` (records the start of a single-finger touch;
    ignores multi-touch) and `handleImageTouchEnd` (computes the delta, rejects
    short and mostly-vertical gestures, calls `preventDefault()` on a consumed
    swipe, then routes right→Like(1) / left→Skip(0) into `handleAction`).
  - Wrapped the image container `div` with `data-testid="scroller-swipe-area"`
    and wired `onTouchStart`/`onTouchEnd`.
- `src/components/ImageScroller.test.tsx`:
  - Imported `fireEvent`.
  - Added an `image swipe gestures` suite: swipe-right Like, swipe-left Skip,
    `onAdvance` reuse, ignored short drag, ignored mostly-vertical drag,
    `preventDefault` on a consumed swipe, and the in-flight duplicate-prevention
    case (no second POST, no second advance).
- `tests/login.spec.ts`:
  - Added a `swipeScrollerImage` helper that dispatches real `touchstart`/
    `touchend` `TouchEvent`s on the swipe area, and a Chromium-only regression
    `mobile swipes record persisted Like and Skip interactions` that verifies a
    swipe-right Like and swipe-left Skip persist with the expected action and a
    non-null integer `view_duration_ms`, reusing the existing login/reset/DB
    helpers. Pinned to Chromium via `test.skip` because touch-constructor support
    is inconsistent on webkit/firefox CI images.

## Tests
- Ran: `npm test` (jest) in `scroller-front-end-poc` — **10 suites, 99 tests, all
  passing** (7 new swipe tests).
- Ran: `npx tsc --noEmit` — no new errors introduced (74 pre-existing jest-dom
  matcher / `Response` typing errors on the untouched base; the project does not
  gate the build on `tsc` over test files).
- `npx playwright test tests/login.spec.ts --list` confirms the new e2e test is
  discovered. The Playwright suite was **not executed locally** — like the
  existing e2e tests it requires the running app plus the backend auth and
  interactions-DB stack and credentials, which are not available in this
  environment. It auto-skips on firefox/webkit and runs on Chromium in CI.

## Documentation updated
- `documentation/tickets/PRO-236-scroller-swipe-actions.md`: this snapshot. No
  architecture/functional docs exist for the scroller component (only the
  per-ticket snapshots under `documentation/tickets/`), so none were changed.

## Open questions
- Desktop mouse-drag swipe support was explicitly optional in the ticket and is
  not implemented; desktop users keep the buttons and tap zones.
