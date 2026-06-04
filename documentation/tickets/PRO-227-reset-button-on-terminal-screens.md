# PRO-227: Add Delete interactions button to no more images screen

## Summary
The "Reset my interactions" button (which deletes all of the current customer's
image interactions after a confirmation dialog) previously only rendered while an
image was on screen, disappearing exactly when a user is most likely to want it —
once the queue is exhausted. This change makes the reset control available on the
terminal **"No more images"** screen and on the **"More images could not be
loaded."** continuation-error screen, while deliberately keeping it hidden on the
transient **"Loading more images..."** screen. Behavior is identical to the existing
button (same confirm dialog, delete call, and success/empty/error status messages),
and after a successful reset the customer stays on the current screen with the status
message shown in place — no automatic refetch/restart.

## Changes
- `src/components/ImageScroller.tsx`:
  - Extracted the reset button + status-message JSX into a hoisted
    `renderResetControls()` helper so it can be reused across render branches.
  - Rendered the reset control in the terminal "No more images" branch and, within
    the loading/error branch, only when `continuationErrored` is true (so the
    transient loading screen never shows it).
  - Switched the two empty-state containers to a `flex flex-col items-center gap-6`
    layout so the text and reset control stack consistently with the main view.
  - Replaced the inline reset block in the main return with `renderResetControls()`.
- `src/components/ImageScroller.test.tsx`:
  - Extended the empty-state test to assert the reset button is present on
    "No more images".
  - Added tests asserting the button is present on the continuation-error screen and
    absent on the loading screen.
  - Added a `from the no-more-images screen` block mirroring the existing reset
    behavior tests (confirm → delete + count, cancel → no-op, zero-count message,
    failure message), including an assertion that the customer remains on the
    terminal screen after a successful reset.

## Tests
- Ran: `make test-dashboard-unit` (jest) in `scroller-front-end-poc`.
- Result: pass. `ImageScroller.test.tsx` 26/26; full suite 75/75 across 10 suites.
- Note: `tsc --noEmit` reports pre-existing jest-dom matcher type errors (32 on
  `main`) that are a repo-wide tsconfig wiring gap, not runtime failures; the new
  tests add more of the identical matcher lines but no new error class. ESLint is not
  configured for non-interactive runs in this repo. The working gate is jest.

## Documentation updated
- `documentation/tickets/PRO-227-reset-button-on-terminal-screens.md`: this snapshot.
- No living architecture/functional doc exists for the component (documentation is
  per-ticket snapshots), so none was changed.

## Open questions
- None. Follow-up flagged during refinement (out of scope): after a successful reset
  on a terminal screen the user has no path back to a fresh queue — a future ticket
  could refetch/restart the session post-reset.
