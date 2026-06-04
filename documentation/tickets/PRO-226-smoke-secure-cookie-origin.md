# PRO-226: post-deploy smoke — treat the smoke origin as a secure context

## Summary
The post-deploy login smoke (`deploy-login.smoke.spec.ts`) consistently failed
in CI: after logging in and landing on `/scroller`, the page bounced back to
`/login`, so `getByRole('heading', { name: 'Scroller' })` never matched (the
only "Scroller" on the login page is a subtitle).

Root cause, confirmed from the now-captured Playwright trace (failure screenshot
= login page; console = `401 (Unauthorized)`): the `auth-token` cookie is set
with `secure: process.env.NODE_ENV === 'production'` (`src/app/api/auth/login/route.ts`),
which is `true` in the deployed build. Chromium treats `localhost` as a secure
context over HTTP, so the Secure cookie works locally — but the CI smoke reaches
the app over `http://host.containers.internal:8410`, which is **not** a secure
context, so Chromium drops the Secure cookie. The follow-up `/api/auth/me` then
returns 401, `AuthContext` sets `user = null`, and `ProtectedRoute` redirects to
`/login`. (This is why it only failed in CI and never locally, and why the
earlier 30s heading-timeout change did not help — it's a redirect, not slowness.)

Real users over ngrok/HTTPS are unaffected; this is purely the CI smoke hitting
the pod over a non-secure HTTP origin.

## Changes
- `scroller-front-end-poc/playwright.config.ts`:
  - For the deploy-smoke Chromium project, add the launch arg
    `--unsafely-treat-insecure-origin-as-secure=<baseURL origin>` (derived from
    `PLAYWRIGHT_BASE_URL`). This marks the smoke's origin as trustworthy so
    Chromium keeps `Secure` cookies exactly as it does for `localhost`.
  - Test-only browser flag; the app's cookie/auth behaviour is unchanged, so
    real HTTPS/ngrok clients keep full Secure-cookie protection.

## Tests
- Ran: `npm run test:e2e:deploy-smoke` locally against the running pod
  (`PLAYWRIGHT_BASE_URL=http://localhost:8410`). Result: 2 passed — the flag does
  not break the (already-secure) localhost path.
- Could not reproduce the non-secure-origin scenario locally: the pod is bound
  to loopback only, and a non-secure origin to it requires either an `/etc/hosts`
  entry (sudo, unavailable) or external DNS (unavailable). The CI run on main is
  the definitive test; traces are now persisted (PRO-228), so if the flag is not
  fully effective the next failure's trace will show it and the fallback is to
  make the cookie's `secure` flag env-configurable for the HTTP deployment.

## Documentation updated
- `documentation/tickets/PRO-226-smoke-secure-cookie-origin.md`: this snapshot.

## Open questions / notes
- Residual uncertainty: whether `--unsafely-treat-insecure-origin-as-secure`
  takes effect in Playwright's managed-browser launch without an explicit
  `--user-data-dir`. Playwright launches with a temp profile, so it should; CI
  confirms.
- Fallback if the flag is insufficient: gate the `auth-token` cookie's `secure`
  attribute on an env var and set it false for the HTTP pod deployment (keeping
  Secure for real HTTPS prod).
