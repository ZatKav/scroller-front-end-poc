# PRO-235: Increase image size in mobile landscape

## Summary
On mobile the property image sat at a fixed `max-h-[70vh]` with the Skip/Like
buttons, Debug toggle and Reset controls stacked beneath it, leaving the image
small — especially in landscape, where vertical space is scarce. This change
makes the image fill the visible viewport. The height cap now uses dynamic
viewport units (`max-h-[70dvh]`) so the image grows as the mobile browser
collapses the address bar, and in **mobile landscape** it expands to the full
viewport (`mobile-landscape:max-h-[100dvh]`) because the visible action controls
(Skip/Like buttons, Debug toggle, Reset block) are hidden there. Interaction in
landscape falls to the existing left/right tap zones. Since CSS cannot remove the
labelled buttons from the accessibility tree on its own, when the buttons are
hidden the tap zones are promoted to real, labelled (`aria-label` Skip/Like),
focusable (`tabIndex 0`) controls so keyboard/assistive-tech users keep both
actions; in portrait/desktop the zones stay `aria-hidden`/non-focusable so they
never duplicate the visible buttons. "Mobile landscape" is scoped to
`(orientation: landscape) and (max-height: 600px)` so the desktop layout (tall
landscape) is unchanged. The Fullscreen API is intentionally not used — it
requires a user gesture and is unsupported for elements on iOS Safari; the dvh
sizing reclaims the address-bar space instead, satisfying the original
orientation-change intent without it.

## Changes
- `src/components/ImageScroller.tsx`:
  - Added `MOBILE_LANDSCAPE_QUERY` (`(orientation: landscape) and (max-height: 600px)`)
    and a `useIsMobileLandscape()` hook that observes orientation via
    `window.matchMedia` (with the deprecated `addListener` fallback for Safari < 14)
    and is feature-guarded for SSR/no-matchMedia environments.
  - Image classes changed from `max-h-[70vh]` to
    `max-h-[70dvh] mobile-landscape:max-h-[100dvh]` (kept `w-full object-contain`).
  - Tap zones: `aria-hidden`/`aria-label`/`tabIndex` and the focus-outline class
    are now conditional on `isMobileLandscape` — inert in portrait/desktop,
    accessible labelled controls in mobile landscape.
  - Added `mobile-landscape:hidden` to the Skip/Like buttons row, the Debug
    toggle `<label>`, the debug readout grid, and a new wrapper around the
    active-view Reset controls (empty/terminal-state Reset is unaffected).
- `src/app/(protected)/page.tsx`:
  - `<main>` changed from `min-h-screen ... px-2 py-4` to
    `min-h-[100dvh] ... px-2 py-4 mobile-landscape:p-0` so the full-height
    landscape image fills the viewport without overflow/scroll, and the container
    tracks the dynamic viewport rather than a fixed 100vh.
- `tailwind.config.js`:
  - Added a `mobile-landscape` screen (`raw: '(orientation: landscape) and (max-height: 600px)'`)
    under `theme.extend.screens`, kept in sync with `MOBILE_LANDSCAPE_QUERY`.
- `jest.setup.js`:
  - Added a default `window.matchMedia` stub (jsdom does not implement it),
    reporting portrait / non-mobile-landscape so components mount without throwing.
- `src/components/ImageScroller.test.tsx`:
  - Updated the `image sizing` test to assert `max-h-[70dvh]` +
    `mobile-landscape:max-h-[100dvh]` and the absence of the old `max-h-[70vh]`/`60vh`.
  - Added a `mobile landscape` describe: tap zones become accessible/labelled/
    focusable; Skip/Like/Debug/Reset carry `mobile-landscape:hidden`; a tap-zone
    skip is recorded with the buttons hidden; tap zones stay inert in portrait
    (single Skip/Like in the a11y tree); and no Fullscreen API call is made.

## Tests
- Ran: `make test-dashboard-unit` (jest) in `scroller-front-end-poc`.
- Result: pass — 92/92 tests across 10 suites (was 84; +8 sizing/landscape/a11y tests).
- Also ran `npm run build` (Next 15 production build incl. type-checking): pass.
  Verified the built CSS contains the `(orientation:landscape) and (max-height:600px)`
  media query and both `70dvh`/`100dvh`, confirming the variant and dvh sizing compile.
- E2E (`make test-dashboard-e2e`, Playwright): NOT run in this environment. The
  suite logs in and renders real stack-rank images, requiring the
  scroller-customer-interactions-db backend (not listening here) plus credentials.
  A landscape-mobile-viewport e2e asserting image fill + hidden buttons + tap-zone
  interaction is left as a follow-up (see Open questions).
- Note: ESLint is not configured for non-interactive runs in this repo (it prompts
  for interactive setup), so jest + `next build` are the working gates, consistent
  with prior tickets.

## Documentation updated
- `documentation/tickets/PRO-235-scroller-mobile-landscape-image.md`: this snapshot.
- No living architecture/functional doc exists for the component (documentation is
  per-ticket snapshots), so none was changed.

## Open questions
- Playwright landscape-mobile e2e deferred (needs the interactions backend +
  auth in CI). The unit suite covers the orientation logic, accessible-tap-zone
  promotion, and the hiding utilities; the dvh/landscape CSS was verified against
  the production build output.
- `dvh` is supported on current iOS/Android targets; older browsers fall back to
  treating `max-h-[70dvh]` as an uncapped-ish value but still render the image
  (no hard dependency). No `vh` `@supports` fallback was added since the deploy
  targets are modern mobile browsers — revisit if older-browser support is needed.
