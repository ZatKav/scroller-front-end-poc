# PRO-232: ngrok login is not succeeding from mobile / direct navigation to /scroller

## Summary
This is the frontend smoke-coverage half of PRO-232. The actual routing fix lives
in `finder-infra` (`nginx-reports.conf`), where the shared nginx used to
unconditionally `302 /scroller` -> `/scroller/login`, blocking authenticated
direct navigation (notably from mobile and on refresh after login). This change
extends the post-deploy Playwright smoke so it can run against a configurable
public HTTPS ngrok origin, adds a mobile profile, and asserts that an
authenticated visitor who navigates directly to the `/scroller` entry path lands
on the protected page and stays there across a refresh.

## Changes
- `scroller-front-end-poc/playwright.config.ts`:
  - Added a `mobile-chrome` (Pixel 5) project to the deploy-smoke project list so
    the smoke exercises the entry path the way a phone does. The existing
    insecure-origin Chromium flag still applies to it for http host origins.
  - Added `extraHTTPHeaders: { 'ngrok-skip-browser-warning': 'true' }` in
    deploy-smoke mode so the ngrok free interstitial warning page does not hijack
    navigations. It is a no-op on non-ngrok origins.
- `scroller-front-end-poc/package.json`:
  - Added `test:e2e:ngrok-smoke` which runs the deploy-smoke suite against a
    configurable public HTTPS ngrok base URL (`PLAYWRIGHT_BASE_URL`, defaulting to
    the shared ngrok endpoint) with `PLAYWRIGHT_APP_BASE_PATH=/scroller`.
- `scroller-front-end-poc/tests/helpers/login.ts`:
  - Added `expectAuthenticatedEntryRendersScroller(page)`: navigates directly to
    the public entry path with a valid session, asserts the protected `Scroller`
    heading renders, that the URL is the entry path (not `/scroller/login`), and
    that a refresh keeps the visitor on the protected page.
- `scroller-front-end-poc/tests/deploy-login.smoke.spec.ts`:
  - Added the `authenticated direct navigation to the entry path renders the
    scroller` smoke test, which logs in then calls the new helper.

## Acceptance criteria mapping
- Authenticated direct navigation opens the scroller from the public entry path
  -> new `expectAuthenticatedEntryRendersScroller` test (chromium + mobile-chrome).
- Unauthenticated direct navigation still reaches `/scroller/login` with no
  `/scroller/scroller` duplication -> existing `expectEntryRedirectsToLogin` test,
  now also run under the mobile profile.
- Mobile login lands on the protected page and survives refresh/re-entry ->
  `loginAndExpectAuthenticated` + `expectAuthenticatedEntryRendersScroller` run
  under the `mobile-chrome` project; the helper reloads and re-asserts.

## Cookie security posture
Unchanged. No auth cookie flags were modified; the smoke only asserts/relies on
the existing `Secure` / `HttpOnly` / `SameSite=strict` / `/scroller` path scope.
On a real HTTPS ngrok origin the `Secure` cookie is honoured natively, so the
existing deploy-smoke cookie bridge (used only for the insecure http host origin)
short-circuits.

## Tests
- `npm test` (jest unit): 79 passed, 10 suites.
- `npx playwright test --list` in deploy-smoke mode against the ngrok base URL:
  6 tests across `chromium` and `mobile-chrome` (config + spec compile, mobile
  project registered, new test discovered).
- `npx tsc --noEmit`: no new errors in changed files (pre-existing jest-dom /
  Playwright-Response type errors in untouched files remain).
- Live Playwright smoke against the public ngrok origin requires the running
  deployment + scroller credentials and is intended to be run via
  `npm run test:e2e:ngrok-smoke`; it is not executable from this sandbox.

## Documentation updated
- `documentation/tickets/PRO-232-scroller-ngrok-mobile-smoke.md` (this snapshot).

## Open questions
- `PLAYWRIGHT_BASE_URL` defaults to the ngrok endpoint named in the ticket; if the
  shared tunnel URL changes, override it via the env var when running the script.
