# codex/pro-157-fix-scroller-front-end-poc-not-deploying-to-main

## Ticket Snapshot

- Identifier: PRO-157
- Title: Fix scroller-front-end-poc not deploying to main
- URL: https://linear.app/property-app/issue/PRO-157/fix-scroller-front-end-poc-not-deploying-to-main
- Branch: codex/pro-157-fix-scroller-front-end-poc-not-deploying-to-main

## Source Requirements

### Description

Use the reports utility, this should contain the CI logs.

repo: scroller-front-end-poc

branch: main

### Key Comments and Acceptance Criteria

- CI failure must be diagnosed from stored report/log artifacts.
- Apply the smallest safe fix that restores pipeline reliability on `main`.

## Architecture Impact

- CI post-test reporting pipeline (`allure-report` stage) now sanitizes invalid merged metadata before report generation.
- No application runtime components changed; impact is isolated to Woodpecker workflow behavior.

## Functional Changes

- `allure-report` now removes empty `executor.json` files (`{}`) from merged `allure-results` before invoking `allure generate`.
- Pipeline behavior remains unchanged for valid Allure inputs; report generation still runs when result artifacts exist.

## Validation

- Reproduced failure pre-fix with CI-equivalent command in `host.containers.internal:5000/allure-cli:2.24.1`: `allure generate` crashed with `java.lang.NullPointerException` in `GaPlugin.getExecutorType`.
- Re-ran same command post-fix in same image: empty executor metadata removed, report generated successfully at `allure-report/index.html`.

## Changed Files

- `.woodpecker.yml`: sanitize empty Allure executor metadata prior to report generation.
- `documentation/tickets/codex/pro-157-fix-scroller-front-end-poc-not-deploying-to-main.md`: ticket implementation and validation record.
