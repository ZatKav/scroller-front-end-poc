# PRO-230: Move the skip and like buttons above the image summary / weights section

## Summary
The Skip and Like action buttons previously rendered **below** the debug readout
(the image-summary caption and the stack-rank-weights JSON), forcing users to look
past debug output to act on an image. This change moves the Skip/Like buttons to sit
**directly under the image**, above the readout section. In the same pass the image
summary was changed from a plain centered paragraph to a monospace, code-style `<pre>`
block matching the weights readout, and the image-summary block and weights block are
now laid out **side by side in a two-column row** to reduce vertical space. Button
behavior (`handleAction`, disabled-while-submitting, advance-on-action), the weights
JSON content, the conditional rendering of the summary when `image_summary` is empty,
and the bottom reset controls are all unchanged. New render order:
image → Skip/Like buttons → 2-column row [ image-summary code block | weights code block ]
→ reset controls.

## Changes
- `src/components/ImageScroller.tsx`:
  - Moved the `<div className="flex gap-4">` Skip/Like block to render directly after
    the `<img>`, above the readout section.
  - Replaced the image-summary `<p className="... text-center">` with a
    `<pre data-testid="image-summary" className="text-xs text-left text-gray-700
    bg-gray-100 rounded-md p-3 overflow-x-auto whitespace-pre-wrap">` styled to match
    the weights readout, kept inside the existing `currentImage.image_summary && (...)`
    conditional. Added `whitespace-pre-wrap` so long summaries wrap inside the column.
  - Wrapped the image-summary `<pre>` and the weights `<pre>` in a
    `<div className="grid grid-cols-2 gap-4 w-full max-w-3xl">` two-column container and
    dropped the per-block `max-w-md` so the columns fill the row.
  - `renderResetControls()` remains at the bottom of the view.
- `src/components/ImageScroller.test.tsx`:
  - Added a `layout` describe block: buttons render above the image-summary and weights
    readout (via `compareDocumentPosition`); image summary renders inside a `<pre>`
    code-style block; and when `image_summary` is null the summary block is omitted while
    the weights block remains.

## Tests
- Ran: `npx jest` (jest) in `scroller-front-end-poc`.
- Result: pass. `ImageScroller.test.tsx` 29/29; full suite 79/79 across 10 suites.
- Note: ESLint is not configured for non-interactive runs in this repo (it prompts for
  interactive setup), so the working gate is jest, consistent with prior tickets.

## Documentation updated
- `documentation/tickets/PRO-230-move-skip-like-buttons.md`: this snapshot.
- No living architecture/functional doc exists for the component (documentation is
  per-ticket snapshots), so none was changed.

## Open questions
- None. Two-column layout uses a fixed `grid-cols-2` per the refined plan; responsive
  single-column collapse on small screens was raised during refinement and left out of
  scope.
