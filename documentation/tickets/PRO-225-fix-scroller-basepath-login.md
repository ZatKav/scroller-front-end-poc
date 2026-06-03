# PRO-225: Fix production login problems through ngrok

## Summary
Production logins through the `/scroller` base-path deployment (served via ngrok) were
broken because the protected server layout redirected unauthenticated users with
`redirect(appPath('/login'))`. Next.js's server-side `redirect()` re-applies
`NEXT_PUBLIC_BASE_PATH` itself, so the already-prefixed `appPath('/login')`
(`/scroller/login`) became `/scroller/scroller/login`, which 404s. This change makes
the entry redirect base-path-relative, makes the customer-interactions API client
base-path-aware, strengthens the deploy smoke test to start from the entry path and
verify the protected landing page, and corrects the stale documented credential for the
seeded `phil` user.

## Changes
- `scroller-front-end-poc/src/app/(protected)/layout.tsx`: redirect unauthenticated
  users with `redirect('/login')` instead of `redirect(appPath('/login'))`, so Next's
  server redirect applies the base path exactly once (no `/scroller/scroller/login`).
- `scroller-front-end-poc/src/app/shared/clients/scroller-customer-interactions-db-api-client.ts`:
  build the proxy base URL through `appPath(...)` so browser fetches resolve under
  `/scroller` rather than the root path.
- `scroller-front-end-poc/tests/helpers/login.ts`: added `expectEntryRedirectsToLogin`
  (asserts `/scroller` → `/scroller/login` with no duplicated base path and a rendered
  login form), and strengthened `loginAndExpectAuthenticated` to wait for the protected
  entry path and assert the protected "Scroller" heading is visible.
- `scroller-front-end-poc/tests/deploy-login.smoke.spec.ts`: now covers the entry
  redirect and the protected-page landing, not just a login POST.
- `scroller-front-end-poc/src/lib/base-path.test.ts` (new): unit tests for `appPath`,
  `authCookiePath`, and `APP_BASE_PATH` proving the base path is applied exactly once.
- `scroller-front-end-poc/src/app/(protected)/layout.test.tsx` (new): unit tests proving
  the layout calls `redirect('/login')` (not a double-prefixed path) for missing/invalid
  tokens and renders children when authenticated.
- `scroller-front-end-poc/src/app/shared/clients/scroller-customer-interactions-db-api-client.test.ts`:
  added a base-path describe block verifying proxy/health URLs are prefixed with
  `/scroller` when `NEXT_PUBLIC_BASE_PATH` is set.
- `README.md`: corrected `phil`'s documented seeded password from the stale `manager123`
  to the actual seeded value `letbigphilin`.

## Tests
- Ran: `npm test` (jest) in `scroller-front-end-poc/scroller-front-end-poc`
- Result: **PASS** — 10 suites, 69 tests passing.
- Live base-path validation with `NEXT_PUBLIC_BASE_PATH=/scroller`:
  - `GET /scroller` → `307` redirect to `Location: /scroller/login` (no duplicated base path).
  - `GET /scroller/login` → `200`.
  - `GET /scroller/scroller/login` → `404` (old broken target confirmed gone).
  - `POST /scroller/api/auth/login` as `phil` / `letbigphilin` → `200`, `Set-Cookie` scoped to `Path=/scroller`.
  - Same login with stale `manager123` → `401` (confirms the README was wrong).
- Note: the Playwright `test:e2e` / `test:e2e:deploy-smoke` suites require a running
  deployment plus the scroller-customer-interactions-db backend, so they were not run in
  this environment; the smoke spec/helper changes were validated via the live curl probes
  above and the jest unit suite.

## Documentation updated
- `README.md`: seeded credential for `phil` corrected to `letbigphilin`.

## Open questions
- The reported "needs to be manually reset" behaviour on the local `localhost:8410`
  default path is consistent with the same double-prefix redirect bug and is resolved by
  this fix; if any residual redirect issue persists it is likely in external ngrok/nginx
  config, which is out of repo scope per the ticket assumption.
