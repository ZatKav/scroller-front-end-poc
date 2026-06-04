# PRO-228 (follow-up): fix CI step ordering so smoke traces are actually persisted

## Summary
PR #35 added trace persistence (copy `test-results/` + `playwright-report/` in
`store-report-locally`) but the traces still never appeared in the reports
server. Root cause: `deploy-main` and `post-deploy-login-smoke` declared
`depends_on`, which puts Woodpecker into **DAG mode**. In DAG mode every step
*without* `depends_on` — including `allure-report` and `store-report-locally` —
runs as a **parallel root at the start of the build**, before the smoke produces
any artifacts. So on main builds the per-commit report directory was created
**empty** (confirmed: `72d5e8d` and `f0a8ff4` report dirs are empty, while PR
builds — where the `depends_on` steps are filtered out and the pipeline runs
sequentially — captured full reports including the new `playwright/` dir).

Fix: remove the two `depends_on` blocks so the pipeline runs **sequentially** in
definition order (`build-and-push → deploy-main → post-deploy-login-smoke →
allure-report → store-report-locally`). Ordering is still gated by each step's
`when.status`. This mirrors the proven approach in `scroller-customer-interactions-db`
(#34), which also dropped `depends_on` to leave DAG mode.

## Changes
- `.woodpecker.yml`:
  - Removed `depends_on: [build-and-push]` from `deploy-main`.
  - Removed `depends_on: [deploy-main]` from `post-deploy-login-smoke`.
  - Added comments on both steps explaining why no `depends_on` (prevents a
    regression that would re-enter DAG mode and store empty reports).

## Tests
- Static: confirmed no `depends_on` keys remain, and the step definition order
  places `allure-report` and `store-report-locally` last (so they run after the
  smoke in sequential mode).
- Runtime verification requires a main CI run (the smoke only runs on push).
  Expected: when the smoke fails, the trace appears under
  `/reports/<repo>/<branch>/<sha>/playwright/test-results/.../trace.zip`.

## Documentation updated
- `documentation/tickets/PRO-228-fix-ci-step-ordering.md`: this snapshot.

## Open questions / notes
- Sequential mode is safe here: the front-end tests share no external resource
  (unlike the backend's postgres race that #34 dealt with), so there is no
  parallelism benefit being given up.
- Once this lands and the trace is captured, it should reveal whether the
  PRO-226 smoke failure is slow vs dropped `host.containers.internal:8410`
  requests.
