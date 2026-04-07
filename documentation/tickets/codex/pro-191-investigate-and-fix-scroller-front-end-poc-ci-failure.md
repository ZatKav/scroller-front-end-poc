# codex/pro-191-investigate-and-fix-scroller-front-end-poc-ci-failure

## Ticket Snapshot

- Identifier: PRO-191
- Title: Investigate and fix scroller-front-end-poc ci failure
- URL: https://linear.app/property-app/issue/PRO-191/investigate-and-fix-scroller-front-end-poc-ci-failure
- Branch: codex/pro-191-investigate-and-fix-scroller-front-end-poc-ci-failure

## Source Requirements

### Description

This message in woodpecker:

`bad_habit`**woodpecker:** steps.allure-report.when[0]

Set an event filter for all steps or the entire workflow on all items of the `when` block

`bad_habit`**woodpecker:** steps.store-report-locally.when[0]

Set an event filter for all steps or the entire workflow on all items of the `when` block

`generic`

step 'build-and-push' depends on unknown step 'test-unit'

### Key Comments and Acceptance Criteria

- Resolve missing event filter errors for `allure-report` and `store-report-locally`.
- Resolve invalid dependency graph where `build-and-push` depends on steps not active for `push` pipelines.

## Architecture Impact

- CI pipeline orchestration in `.woodpecker.yml` was corrected so step gating and dependency edges are internally consistent for `push` pipelines to `main`.
- Post-run reporting stages now declare explicit event filters, aligning their `when` conditions with the workflow-level event policy.

## Functional Changes

- Removed `build-and-push` dependencies on `test-unit` and `test-e2e`, which are intentionally scoped to `pull_request` and `manual` events.
- Added `event` filters (`pull_request`, `push`, `manual`) to `allure-report` and `store-report-locally` while preserving `status: [ success, failure ]` behavior.

## Validation

- Reproduced ticket-class failures against `origin/main` with a targeted YAML semantic check:
  - missing `when.event` on `allure-report`
  - missing `when.event` on `store-report-locally`
  - `build-and-push` dependency on non-push step `test-unit`
- Re-ran the same semantic check against patched `.woodpecker.yml`; result: `OK`.
- YAML parse sanity check passed: `ruby -ryaml -e 'YAML.load_file(".woodpecker.yml"); puts "YAML_OK"'`.

## Changed Files

- `.woodpecker.yml`: removed invalid push dependency edge and added explicit `event` filters to post-run stages.
- `documentation/tickets/codex/pro-191-investigate-and-fix-scroller-front-end-poc-ci-failure.md`: added ticket artifact documenting diagnosis, fix, and validation.
