# PRO-159-add-allure-report-generation-and-storage-and-ci-log-storage-to-scroller-front-end-poc

## Ticket Snapshot

- Identifier: PRO-159
- Title: Add allure report generation and storage and ci log storage to scroller-front-end-poc
- URL: https://linear.app/property-app/issue/PRO-159/add-allure-report-generation-and-storage-and-ci-log-storage-to
- Branch: PRO-159-add-allure-report-generation-and-storage-and-ci-log-storage-to-scroller-front-end-poc

## Source Requirements

### Description

Add Allure-based report generation and report/log artifact storage to the frontend pipeline by following the established storage pattern used in `finder-enrichment-db`, while preserving existing build/push/deploy behavior and Playwright no-tests compatibility.

### Key Comments and Acceptance Criteria

- Generate Allure raw results from both Jest and Playwright test runs.
- Keep Playwright no-tests behavior so missing e2e coverage does not fail report publication.
- Add post-run report generation + artifact storage stages that run on both successful and failed pipelines.
- Publish report artifacts to `/reports/<repo>/<branch>/<commit-sha>/index.html` and update branch `latest`.
- Retain only problem-stage logs for storage; successful stage logs are removed.

## Architecture Impact

- CI flow now includes a post-test artifact lane: `allure-report` then `store-report-locally`.
- Frontend test runners now emit suite-scoped Allure raw results (`allure-results-unit`, `allure-results-e2e`) consumed by the report stage.
- Reports volume integration (`/reports/${CI_REPO}/${CI_COMMIT_BRANCH}/${CI_COMMIT_SHA}` + `latest`) is now an explicit contract for this repository.

## Functional Changes

- Added Jest Allure reporter and Playwright Allure reporter dependencies in app `package.json`/`package-lock.json`.
- Updated Jest configuration to use `jest-allure2-reporter` with `resultsDir: allure-results-unit`.
- Updated Playwright configuration to keep HTML output and also emit Allure results into `allure-results-e2e`.
- Updated Woodpecker test stages to use captured log files and remove logs on success.
- Added `allure-report` and `store-report-locally` stages that merge available results, generate `allure-report/index.html`, copy report artifacts to `/reports/...`, print URLs, and copy retained `ci-logs` only when present.
- Updated root and app `.gitignore` files for generated Allure/report/log directories.
- Updated repository README with CI report/log artifact behavior and new CI test commands.

## Validation

- `npm run test:allure:unit -- --runInBand` (from `scroller-front-end-poc/`) passes and emits Allure unit artifacts.
- `npm run test:e2e:ci -- --list` (from `scroller-front-end-poc/`) validates Playwright config load with Allure reporter wiring and keeps the no-tests policy.
- `ruby -ryaml -e 'YAML.safe_load(File.read(".woodpecker.yml"), aliases: true)'` (repo root) validates CI YAML parse.

## Changed Files

- `.woodpecker.yml`: added test-stage log retention for unit/e2e and new Allure report/storage stages.
- `.gitignore`: added root ignore rules for Allure/report/log artifacts.
- `README.md`: documented CI report and retained-log artifact behavior.
- `scroller-front-end-poc/package.json`: added CI scripts for unit Allure and e2e pass-with-no-tests flow.
- `scroller-front-end-poc/package-lock.json`: locked new Allure reporter dependencies.
- `scroller-front-end-poc/jest.config.js`: enabled Allure reporter and unit results directory.
- `scroller-front-end-poc/playwright.config.ts`: added Allure reporter output for e2e results.
- `scroller-front-end-poc/.gitignore`: ignored app-local Allure/report artifacts.
- `documentation/tickets/PRO-159-add-allure-report-generation-and-storage-and-ci-log-storage-to-scroller-front-end-poc.md`: ticket implementation artifact.
