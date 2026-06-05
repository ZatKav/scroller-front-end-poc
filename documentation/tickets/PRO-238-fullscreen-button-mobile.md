# PRO-238: Create fullscreen button for mobile

## Summary
PRO-237's PWA only removes the URL bar for the *installed* app launched from the
home screen — it does nothing in a normal browser tab, which is how the scroller
is actually used (the ngrok `/scroller` endpoint on a phone). In a plain tab the
only way to drop the URL bar on Android is the Fullscreen API, which requires a
user gesture. This adds a portrait-only fullscreen toggle button to the scroller:
on a Fullscreen-capable browser the button appears in portrait; tapping it enters
fullscreen (hiding the URL bar); it is hidden in landscape (alongside the PRO-235
controls); and rotating back to portrait auto-exits fullscreen. The button is
feature-detected, so it never appears on iPhone Safari (no element Fullscreen
API). This does not reverse PRO-235 — that decision only excluded *auto*-
fullscreening on rotation; entering landscape still triggers neither request nor
exit, so the existing "does not attempt the Fullscreen API when entering
landscape" test stays green.

## Changes
- `src/components/ImageScroller.tsx`:
  - New `import { Maximize } from 'lucide-react'` (first use of the already-
    declared dependency).
  - Added `PORTRAIT_QUERY`, minimal WebKit-prefixed Fullscreen typings, and DOM
    helpers `getFullscreenElement` / `requestPageFullscreen` / `exitPageFullscreen`
    (unprefixed with `webkit*` fallback; promise rejections swallowed since
    fullscreen is best-effort).
  - Added `useIsPortrait()` (matchMedia `(orientation: portrait)`, mirroring
    `useIsMobileLandscape`'s plumbing incl. the Safari < 14 `addListener`
    fallback, SSR-safe) and `useFullscreenSupported()` (reads
    `document.fullscreenEnabled` in an effect; false/undefined on iPhone Safari,
    which is how the button stays hidden there).
  - Component now calls both hooks and runs an effect that exits fullscreen when
    orientation returns to portrait (`document.fullscreenElement` set).
  - Renders a portrait-only fullscreen button (`data-testid="fullscreen-button"`,
    `aria-label="Enter fullscreen"`, 44×44 target, `z-10` above the Skip/Like tap
    zones, `onClick` does `stopPropagation()` + `requestPageFullscreen()`),
    visible only when `fullscreenSupported && isPortrait`.
- `src/components/ImageScroller.test.tsx`:
  - New `fullscreen button (PRO-238)` describe with a per-query matchMedia mock
    (answers portrait vs landscape and can fire an orientation change) plus
    Fullscreen API stubs. Covers: button shown in portrait when supported; hidden
    in landscape; absent when unsupported (iPhone Safari); tap calls
    `requestFullscreen` and records no Skip/Like interaction; rotating back to
    portrait while fullscreen calls `exitFullscreen`.

## Tests
- Ran: `make test-dashboard-unit` (jest) in `scroller-front-end-poc`.
- Result: pass — 111/111 tests across 12 suites (+5 in the existing ImageScroller
  suite). The PRO-235 "no Fullscreen API when entering landscape" test stays
  green.
- Also ran `npm run build` (Next 15 production build incl. type-checking): pass —
  the `lucide-react` import and the new Tailwind utilities compile, no type
  errors.
- E2E (`make test-dashboard-e2e`, Playwright): NOT run here (needs the
  scroller-customer-interactions-db backend + auth). Real fullscreen / URL-bar
  removal is a device behaviour, so it is manual QA (see Open questions).

## Documentation updated
- `documentation/tickets/PRO-238-fullscreen-button-mobile.md`: this snapshot.
- No living architecture/functional doc exists for the front end (per-ticket
  snapshots, as in PRO-235/PRO-237); README "Project structure" tree is
  intentionally abbreviated and left as-is.

## Open questions
- Manual device QA pending: on Android Chrome at the ngrok `/scroller` endpoint,
  confirm the portrait button enters fullscreen (URL bar gone), the button is
  hidden in landscape, and rotating back to portrait exits fullscreen.
- iPhone Safari: button intentionally absent (API unsupported); those users'
  only chrome-free path remains the PRO-237 installed PWA. Documented limitation.
- Loading directly in landscape shows no button (rotate to portrait once to
  access it) — the agreed model; the browser's native swipe-to-exit remains a
  universal fallback.
- Needs merge + deploy before it is testable on the ngrok endpoint.
