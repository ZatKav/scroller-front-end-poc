# PRO-234: Add debug checkbox to scroller front end

## Summary
On mobile the per-image JSON summary and stack-rank weights readout is large and
unreadable, and previously rendered unconditionally below the Skip/Like buttons
(it "fell below the fold" after PRO-233 but was still always present). This change
gates that readout behind a new **Debug** checkbox positioned directly under the
Skip/Like button row. The checkbox is unticked by default, so the summary
(`data-testid="image-summary"`) and weights (`data-testid="stack-rank-weights"`)
blocks are not rendered at all on first load; ticking it reveals both, unticking
hides them again, and the preference persists (session-only React state) as the
customer advances through images. The toggle is a real, focusable `<input
type="checkbox">` inside a `<label>`, so keyboard/assistive-tech users can operate
it. No backend, contract, or API changes; persistence intentionally does not use
localStorage (resets to unticked on reload), confirmed with the product owner.

## Changes
- `src/components/ImageScroller.tsx`:
  - Added `const [debug, setDebug] = useState(false);` session-only state.
  - Inserted a labelled `Debug` checkbox (`data-testid="debug-toggle"`) immediately
    after the Skip/Like `flex gap-4` button row and before the readout.
  - Wrapped the existing `grid grid-cols-2` summary/weights block in `{debug && ( ... )}`
    so it only renders when Debug is ticked. Block contents/formatting are unchanged.
- `src/components/ImageScroller.test.tsx`:
  - Updated the initial-render test to drop the now-default-hidden summary text
    assertion (replaced with an explanatory comment); the `alt="Nice house"` image
    attribute assertion is retained.
  - Updated the `layout` tests and both stack-rank-weights JSON tests to tick the
    Debug toggle (via `userEvent.click`) before asserting the readout is present;
    these tests are now `async`.
  - Added a new `debug toggle` describe with three tests: hidden-by-default with an
    unticked checkbox; reveal-on-tick then hide-on-untick; and preference persists
    (checkbox stays checked, weights stay visible) after advancing to the next image.

## Tests
- Ran: `npm test` (jest, equivalent to `make test-dashboard-unit` used by prior tickets)
  in `scroller-front-end-poc`.
- Result: pass — 87/87 tests across 10 suites (was 84; +3 new debug-toggle tests, net of
  edits to existing readout tests).
- E2E (Playwright): NOT run in this environment — the suite needs the
  scroller-customer-interactions-db backend on :8400 (not listening here) plus login
  credentials/API key. No e2e changes were required for this presentational toggle.
- Note: ESLint is not configured for non-interactive runs in this repo (it prompts for
  interactive setup), so jest is the working gate, consistent with prior tickets.

## Documentation updated
- `documentation/tickets/PRO-234-scroller-debug-checkbox.md`: this snapshot.
- No living architecture/functional doc exists for the component (documentation is
  per-ticket snapshots), so none was changed.

## Open questions
- None. Persistence is session-only (no localStorage) and a single checkbox controls
  both the summary and weights together, per the approved refinement.
