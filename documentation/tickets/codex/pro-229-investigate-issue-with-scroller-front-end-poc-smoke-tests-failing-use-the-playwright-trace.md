# codex/pro-229-investigate-issue-with-scroller-front-end-poc-smoke-tests-failing-use-the-playwright-trace

## Ticket Snapshot

- Identifier: PRO-229
- Title: Investigate issue with scroller-front-end-poc smoke tests failing, use the playwright trace
- URL: https://linear.app/property-app/issue/PRO-229/investigate-issue-with-scroller-front-end-poc-smoke-tests-failing-use
- Branch: codex/pro-229-investigate-issue-with-scroller-front-end-poc-smoke-tests-failing-use-the-playwright-trace

## Source Requirements

### Description

The ticket payload did not include a description. The issue title requests investigation of failing `scroller-front-end-poc` smoke tests using the Playwright trace.

### Key Comments and Acceptance Criteria

- Review Utils returned no ticket comments.
- Fix the post-deploy Playwright smoke failure on `main` without changing production auth behavior.
- Use stored report and Playwright trace evidence before changing the test.

## Architecture Impact

- Production auth and cookie issuance remain unchanged: the login route still emits a `Secure`, `HttpOnly`, `SameSite=Strict` auth cookie when running in production.
- The deploy-smoke Playwright helper now bridges the successful login token into the browser context only when `PLAYWRIGHT_DEPLOY_SMOKE=1`, compensating for the HTTP-only `host.containers.internal` test origin.

## Functional Changes

- The post-deploy smoke test still verifies that the deployed login API accepts valid credentials and returns an authenticated user.
- For deploy smoke only, the helper installs the returned auth token as a non-Secure Playwright context cookie scoped to the configured base path, then reloads the protected entry page so the server sees the authenticated session.
- Normal local and CI e2e tests keep the browser-managed cookie flow.

## Validation

- Inspected the latest failure-only Allure report for `ZatKav/scroller-front-end-poc/main/caf0169d090bb8c8d2849cd83364d38f67119766`.
- Inspected the failed Playwright trace network payload: login returned `200 OK` and `Set-Cookie: auth-token=...; Path=/scroller; Secure`, while subsequent protected RSC requests carried no `Cookie` header and the page snapshot stayed on the login form.
- `PLAYWRIGHT_DEPLOY_SMOKE=1 PLAYWRIGHT_BASE_URL=http://localhost:8410 PLAYWRIGHT_APP_BASE_PATH=/scroller npx playwright test tests/deploy-login.smoke.spec.ts --project=chromium` passed locally against the deployed app through the host-equivalent `localhost` origin.
- `npm test -- --runTestsByPath src/lib/base-path.test.ts 'src/app/(protected)/layout.test.tsx'` passed.
- `npm run test:e2e:deploy-smoke` could not run as-is on the host because `host.containers.internal` is only resolvable from the CI/container network; the equivalent localhost smoke command above validates the same test logic.
- `npx tsc --noEmit` remains blocked by existing unrelated project type errors in Jest matcher typings and `tests/login.spec.ts` response typing.

## Changed Files

- `scroller-front-end-poc/tests/helpers/login.ts`: bridge the deploy-smoke auth cookie after a successful login response and reload the protected entry path.
- `documentation/tickets/codex/pro-229-investigate-issue-with-scroller-front-end-poc-smoke-tests-failing-use-the-playwright-trace.md`: record the CI evidence, scope, and validation.
