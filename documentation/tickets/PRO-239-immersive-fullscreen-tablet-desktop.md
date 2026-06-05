# PRO-239: Make iPad Pro / desktop landscape work like mobile (immersive via fullscreen)

## Summary
The immersive scroller view (full-viewport image; Skip/Like, Debug and Reset
hidden; tap zones promoted) was gated on `(orientation: landscape) and
(max-height: 600px)`, so tablets (iPad Pro landscape ≥834px tall) and desktop
were excluded by design. This extends immersive to those devices by driving it
off browser fullscreen in addition to the phone short-landscape query: the
immersive layout is now shown when `isMobileLandscape || isFullscreen`. The
PRO-238 fullscreen button is broadened from portrait-only to **any
Fullscreen-capable browser in any orientation** and made a **toggle** (enter/exit,
`Maximize`/`Minimize`, state-aware `aria-label`) that stays visible in the
immersive view as the exit affordance. Because immersive follows *live* fullscreen
state and is not persisted, a refresh (and Esc, and the toggle) returns to the
normal view automatically — no stored setting. iPhone Safari (no element
Fullscreen API) is unchanged: no button, orientation-driven immersive remains its
path.

## Changes
- `src/components/ImageScroller.tsx`:
  - Added `useIsFullscreen()` (tracks `getFullscreenElement()` via the
    `fullscreenchange` event, incl. the `webkitfullscreenchange` fallback;
    client-only/SSR-safe).
  - Introduced a single `immersive = isMobileLandscape || isFullscreen` signal and
    replaced the `mobile-landscape:` Tailwind variants and the `isMobileLandscape`
    layout/a11y usages with it: image `${immersive ? 'max-h-[100dvh]' :
    'max-h-[70dvh]'}`; Skip/Like buttons row, Debug `<label>`, debug grid and
    Reset wrapper use `${immersive ? 'hidden' : ''}`; tap-zone
    `aria`/`tabIndex`/focus promotion gates on `immersive`.
  - Fullscreen button: shows whenever `fullscreenSupported` (dropped the
    `isPortrait` gate); `onClick` toggles `isFullscreen ? exitPageFullscreen() :
    requestPageFullscreen()`; `Maximize`/`Minimize` icon + `aria-label`
    "Enter/Exit fullscreen"; kept above the tap zones (`z-10`) with
    `stopPropagation()`, and visible in the immersive view as the exit.
  - Kept the rotate-to-portrait auto-exit effect (phones); imported `Minimize`;
    refreshed the now-stale PRO-235/PRO-238 comments to the `immersive` model.
- `src/app/globals.css`:
  - Added `:fullscreen main { padding: 0 }` (+ `:-webkit-full-screen main`) so the
    page padding collapses in the fullscreen-driven immersive view, mirroring the
    `mobile-landscape` padding collapse on phones. Chosen over threading
    `isFullscreen` into `page.tsx` so it stays device-agnostic and CSS-only.
- `src/components/ImageScroller.test.tsx`:
  - Updated the PRO-235 image-sizing and hides-controls tests to the immersive
    classes (`max-h-[70dvh]` normal / `max-h-[100dvh]` + `hidden` immersive).
  - Reworked the fullscreen suite: button now shows in landscape too; added a
    `setFullscreen()` helper (flips `fullscreenElement` + fires
    `fullscreenchange`); added cases — toggle-exit while fullscreen (with "Exit
    fullscreen" label), immersive view appears on a non-mobile-landscape viewport
    when fullscreen (image fills, controls hidden, toggle stays), and the normal
    view is restored on exit. Kept request-on-tap, unsupported-hidden, and
    rotate-to-portrait-exit.

## Tests
- Ran: `make test-dashboard-unit` (jest) in `scroller-front-end-poc`.
- Result: pass — 113/113 across 12 suites. The PRO-235 "no Fullscreen on entering
  landscape" test stays green (entering landscape still triggers neither request
  nor exit; auto-exit is on entering portrait).
- Also ran `npm run build` (Next 15 production build incl. type-checking): pass.
  Verified the built CSS contains `.max-h-[100dvh]` / `.max-h-[70dvh]` (Tailwind
  picked up the dynamically-built classes), `.hidden`, and the `:fullscreen main`
  / `:-webkit-full-screen main` padding-collapse rules.
- E2E (Playwright): NOT run here (needs the scroller-customer-interactions-db
  backend + auth). Real fullscreen behaviour is device/manual QA.

## Documentation updated
- `documentation/tickets/PRO-239-immersive-fullscreen-tablet-desktop.md`: this
  snapshot. No living architecture/functional doc exists (per-ticket snapshots).

## Open questions
- Manual QA: on iPad Pro and desktop Chrome, confirm the toggle enters the
  immersive view (image fills, controls hidden), the toggle/Esc/refresh exit, and
  the phone rotate-to-landscape immersive is unchanged.
- iPhone Safari remains immersive-via-orientation only (no Fullscreen API) — no
  URL-bar removal there; the PRO-237 installed PWA stays its chrome-free path.
- On a tablet that entered fullscreen in portrait, rotating to portrait again will
  exit (the shared rotate-to-portrait rule). Accepted as consistent with phones;
  revisit if tablet users find it surprising.
- `tailwind.config.js` `mobile-landscape` screen is retained — still used by
  `page.tsx` safe-area padding (PRO-237).
