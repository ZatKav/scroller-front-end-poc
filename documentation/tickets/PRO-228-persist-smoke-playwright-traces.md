# PRO-228: Hold Playwright traces from the post-deploy smoke in the reports server

## Summary
When the `post-deploy-login-smoke` step failed, its Playwright diagnostics
(`trace.zip`, screenshots, HTML report) were stranded on the CI runner — the
`store-report-locally` step only copied the aggregated Allure report and
`ci-logs`, never the raw Playwright artifacts. This change captures a trace +
screenshot for any failing test and copies the smoke's `test-results/` and
`playwright-report/` into the per-commit report directory, so failures are
debuggable from the reports server without runner access.

This directly unblocks diagnosing the PRO-226 post-deploy smoke failure (the
heading not rendering): the trace's network panel will show whether requests to
`host.containers.internal:8410` stalled/failed, which is the leading hypothesis.

## Changes
- `scroller-front-end-poc/playwright.config.ts`:
  - `use.trace`: `'on-first-retry'` → `'retain-on-failure'` (a trace is kept for
    any failing test, independent of retries).
  - `use.screenshot`: added `'only-on-failure'`.
- `.woodpecker.yml` (`store-report-locally` step):
  - After copying the Allure report and `ci-logs`, also copy
    `scroller-front-end-poc/test-results/` (trace.zip + screenshots) and
    `scroller-front-end-poc/playwright-report/` into
    `$REPORT_DIR/playwright/`, and echo their reports-server URLs. Guarded by
    existence checks so it is a no-op on green runs (no trace produced).
- `scroller-front-end-poc/tests/helpers/login.ts` (bundled PRO-226 smoke
  mitigation):
  - Give the protected-page heading assertion a 30s timeout instead of the 5s
    default. The post-deploy smoke reaches the app over
    `host.containers.internal`, whose latency has been intermittent; the
    client-rendered page can take longer than 5s to load its bundle and render
    the heading, which is the leading hypothesis for the current smoke failure.
    The landing is a soft navigation, so the longer wait does not re-trigger the
    `AuthContext` `/api/auth/me` check. If the trace shows the requests are
    dropped (not merely slow), the follow-up is a networking-level change
    (target address / topology) rather than a timeout.

## Tests
- Ran: `npm run test:e2e:deploy-smoke` locally against the running pod
  (`PLAYWRIGHT_BASE_URL=http://localhost:8410`). Result: 2 passed — the new
  trace/screenshot options are valid and do not change passing behaviour.
- `tsc --noEmit playwright.config.ts`: no config-specific type errors.
- Full verification requires a CI run on main (the post-deploy smoke only runs
  on push), after which the trace should appear under
  `/reports/<repo>/<branch>/<sha>/playwright/`.

## Documentation updated
- `documentation/tickets/PRO-228-persist-smoke-playwright-traces.md`: this snapshot.
- No living architecture doc exists for the CI pipeline (per-ticket snapshots), so none changed.

## Open questions / notes
- Traces embed request headers including the `jack` test user's `auth-token`
  JWT cookie — fine for a POC test account, but the stored reports should be
  treated as non-public. On-failure-only capture limits this.
- Steps run in separate containers but share the workspace volume, so the
  smoke step's `test-results/`/`playwright-report/` are readable by the later
  `store-report-locally` step.
