# PRO-256: [FE-5] Deferred add View listing button from scroller cards

## Summary
Adds the card-to-detail navigation now that stack-rank cards expose `listing_id` (SCI-1 / PRO-250). Each scroller card renders a "View listing" overlay control that links to the existing `/listing/[id]` detail route, keyed on the enrichment-db listing id the card carries. The control mirrors the existing fullscreen toggle: it sits above the Skip/Like tap zones (`z-10`) and `stopPropagation`s its click, so opening the detail page neither records a Skip/Like interaction nor advances the card. It is positioned top-left so it never collides with the top-right fullscreen toggle, is hidden in the immersive (fullscreen / mobile-landscape) view alongside the Skip/Like buttons, and is not rendered at all when the card has no `listing_id` (no broken `/listing/null` href). Navigation goes through `appPath(...)` so it respects `NEXT_PUBLIC_BASE_PATH`. No backend, contract, or API changes — `listing_id` is already plumbed end-to-end, and opening the detail page records no view/interaction.

## Changes
- `src/components/ImageScroller.tsx`:
  - Imported `next/link` `Link`, `appPath` from `@/lib/base-path`, and the `ExternalLink` lucide icon.
  - Derived `const listingId = currentImage.listing_id;`.
  - Rendered a `Link`-based overlay control (`data-testid="view-listing-button"`, `aria-label="View listing"`) gated on `!immersive && listingId != null`, styled to match the `fullscreen-button` (rounded `bg-black/40`, `z-10`, blur), positioned `top-2 left-2`, with an `onClick` that calls `event.stopPropagation()` so the tap never reaches the Skip/Like zones.
- `src/components/ImageScroller.test.tsx`: new `view listing button (PRO-256)` suite — links to `/listing/<id>` for the current card; not rendered when `listing_id` is absent; not rendered when `listing_id` is explicitly `null`; activating it records no interaction and does not advance the card; hidden in the immersive view.
- `tests/view-listing.spec.ts`: new e2e spec — the View-listing control navigates to the listing detail route (asserted against the control's own href so it does not hard-code the seeded id); and the control does not disturb Skip/Like button recording/advancement.

## Tests
- Ran: `npm test` in `scroller-front-end-poc/scroller-front-end-poc`
- Result: pass — 21 suites / 200 tests (includes the 5 new `ImageScroller` unit tests for the View-listing control). `ImageScroller.test.tsx` alone: 61 tests pass.
- e2e (`tests/view-listing.spec.ts`) follows the existing `login.spec.ts` seeding pattern (`ensureSeededScrollerImages` + interaction reset) and requires the live CI backends/credentials; it runs under `make`/`npm run test:e2e:ci`, not the unit run.
- `npx tsc --noEmit`: only the pre-existing baseline errors (jest-dom / playwright type-setup matchers not picked up by a bare `tsc`), consistent with the PRO-250 snapshot; no new type errors from this change.

## Documentation updated
- `documentation/tickets/PRO-256-fe-5-view-listing-button.md` (this snapshot). No functional/architecture doc tracks the per-card affordances; the scroller card behaviour is documented per-ticket in `documentation/tickets/`.

## Open questions
- None.
