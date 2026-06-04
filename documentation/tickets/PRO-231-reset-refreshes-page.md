# PRO-231: Reset my interactions button should refresh the page, triggering the stack rank refresh etc.

## Summary
The "Reset my interactions" button previously deleted the customer's image
interactions and showed an inline status message, leaving stale stack-rank
results on screen until the user manually refreshed. It now performs a full
page reload (`window.location.reload()`) on a successful delete, so the
client-side queue fetch in the protected home page re-runs on mount and
re-fetches a fresh stack-rank queue and profile weights. The reload fires
unconditionally on success, including when zero interactions were removed. On
failure the existing inline error is kept and the page does not reload, and
cancelling the confirmation dialog still does nothing.

## Changes
- `src/components/ImageScroller.tsx`: In `handleReset`, call
  `window.location.reload()` after a successful
  `deleteCustomerImageInteractions` instead of setting a success message.
  Removed the now-dead success-message path; replaced the
  `{ kind: 'success' | 'error'; text }` `resetMessage` state with a simpler
  error-only `resetError: string | null`. The error branch re-enables the
  button (`setResetting(false)`) since the page stays put.
- `src/components/ImageScroller.test.tsx`: Stub `window.location.reload` via a
  `reloadMock` in `beforeEach` (jsdom does not implement navigation), restoring
  the original `window.location` in `afterEach`. Reworked the reset tests on
  both the main scroller screen and the no-more-images terminal screen to
  assert the reload fires on success (including `deleted === 0`) and does not
  fire on cancel or delete-failure.

## Tests
- Ran: `npx jest` in `scroller-front-end-poc/scroller-front-end-poc`
- Result: pass — 10 suites / 76 tests, including 26 in `ImageScroller.test.tsx`.
- Note: `tsc --noEmit` reports pre-existing errors on `main` (42 errors, mostly
  jest-dom matcher augmentation and Playwright spec types not picked up by bare
  `tsc`); the project gate is jest, not bare `tsc`. ESLint is not configured in
  this repo (`next lint` prompts for setup), so lint was not run.

## Documentation updated
- `documentation/tickets/PRO-231-reset-refreshes-page.md`: this snapshot. No
  separate architecture/functional docs reference the reset behaviour.

## Open questions
- None. Both refinement decisions (full `window.location.reload()`; reload even
  when `deleted === 0`) are implemented as specified.
