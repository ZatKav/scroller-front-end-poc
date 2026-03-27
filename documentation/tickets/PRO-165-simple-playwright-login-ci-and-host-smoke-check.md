# PRO-165-simple-playwright-login-ci-and-host-smoke-check

## Ticket Snapshot

- Identifier: PRO-165
- Title: simple playwright script that logs into the front end on the host machine after deployment and checks that the login succeeds
- URL: https://linear.app/property-app/issue/PRO-165/simple-playwright-script-that-logs-into-the-front-end-on-the-host
- Branch: PRO-165-simple-playwright-login-ci-and-host-smoke-check

## Source Requirements

### Description

Add a real login Playwright test in CI before build/deploy, add a post-deploy host login smoke check for `main`, wire required auth runtime env (`JWT_SECRET_KEY`) in CI and deployment, and keep post-deploy smoke additive to pre-deploy coverage.

### Key Comments and Acceptance Criteria

- Pre-deploy `test-e2e` stage must run a real login flow and fail pipeline before build/deploy if login fails.
- Post-deploy smoke must run after `deploy-main` on `main`, target host deployment, and fail pipeline when host login fails.
- Login success for this ticket is defined as submitting valid credentials and leaving `/login`.
- Deployment runtime must receive `JWT_SECRET_KEY` so auth routes function.

## Architecture Impact

- CI pipeline now has two explicit login verification points in `.woodpecker.yml`: pre-deploy app validation and post-deploy host validation.
- Playwright configuration in `scroller-front-end-poc/playwright.config.ts` supports two execution modes via environment selection:
  - pre-deploy mode with local `webServer`
  - deploy-smoke mode targeting host URL without local server startup
- Pod deployment manifest `podman-scroller-kube.yaml` now injects `JWT_SECRET_KEY` directly into the deployed container runtime.

## Functional Changes

- Added real Playwright login coverage:
  - `tests/login.spec.ts` for pre-deploy CI validation.
  - `tests/deploy-login.smoke.spec.ts` for post-deploy host smoke.
  - `tests/helpers/login.ts` shared helper that performs username/password login and verifies browser leaves `/login`.
- Updated package scripts:
  - `test:e2e:ci` now runs real tests (no `--pass-with-no-tests`) and targets Chromium in CI.
  - `test:e2e:deploy-smoke` runs host-targeted smoke with deploy mode env.
- Aligned Playwright runtime versions across repo and CI:
  - Pinned `@playwright/test` and `playwright` to `1.58.2` in package metadata.
  - Updated CI Playwright container image tags to `mcr.microsoft.com/playwright:v1.58.2-noble`.
- Updated seeded auth users to deterministic credentials used by CI checks:
  - `jack / password123`
  - `phil / manager123`
- Updated README with required auth/login-check env and the new CI/deploy login test behavior.

## Validation

- Ran: `npm run test:e2e:deploy-smoke -- --list` (from `scroller-front-end-poc/scroller-front-end-poc`) 
- Result: pass; deploy smoke mode lists exactly `deploy-login.smoke.spec.ts` on Chromium.
- Ran: `JWT_SECRET_KEY=... E2E_LOGIN_USERNAME=jack E2E_LOGIN_PASSWORD=password123 npm run test:e2e:ci -- --project=chromium`
- Result: blocked in local environment by Next.js dev server watcher limit (`EMFILE`, then Playwright `webServer` startup timeout). CI container environment is expected to execute this path.

## Changed Files

- `.woodpecker.yml`: Injected login/auth env for `test-e2e`; added `post-deploy-login-smoke` stage after `deploy-main` on `main`.
- `podman-scroller-kube.yaml`: Added `JWT_SECRET_KEY` env injection for deployed frontend container.
- `README.md`: Documented auth/login env requirements, new CI/deploy Playwright commands, and seeded credentials used by checks.
- `scroller-front-end-poc/playwright.config.ts`: Added dual execution mode (local pre-deploy vs host deploy-smoke), smoke test selection, and mode-specific browser project selection.
- `scroller-front-end-poc/package.json`: Replaced pass-with-no-tests CI command with real Playwright run; added deploy smoke script.
- `scroller-front-end-poc/package-lock.json`: Synced lock metadata to pinned Playwright `1.58.2`.
- `scroller-front-end-poc/data/users.json`: Updated seeded bcrypt hashes to deterministic credentials for automated login checks.
- `scroller-front-end-poc/tests/helpers/login.ts`: Added shared login helper and redirect assertion.
- `scroller-front-end-poc/tests/login.spec.ts`: Added pre-deploy login spec.
- `scroller-front-end-poc/tests/deploy-login.smoke.spec.ts`: Added post-deploy host smoke spec.
- `documentation/tickets/PRO-165-simple-playwright-login-ci-and-host-smoke-check.md`: Added this ticket artifact.
