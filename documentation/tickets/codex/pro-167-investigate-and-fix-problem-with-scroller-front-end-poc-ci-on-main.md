# codex/pro-167-investigate-and-fix-problem-with-scroller-front-end-poc-ci-on-main

## Ticket Snapshot

- Identifier: PRO-167
- Title: Investigate and fix problem with scroller-front-end-poc ci on main
- URL: https://linear.app/property-app/issue/PRO-167/investigate-and-fix-problem-with-scroller-front-end-poc-ci-on-main
- Branch: main

## Source Requirements

### Description

Error response from daemon: http: server gave HTTP response to HTTPS client on allure report stage.

repo: scroller-front-end-poc

branch: main

### Key Comments and Acceptance Criteria

- Fix CI failure in `main` for `scroller-front-end-poc`.
- Resolve allure-report stage failure caused by container image pull behavior.

## Architecture Impact

- CI pipeline dependency changed for the `allure-report` Woodpecker step from a local insecure registry image to a public registry image.
- Removes reliance on runner-side insecure registry configuration for `host.containers.internal:5000` in this step.

## Functional Changes

- `.woodpecker.yml` `allure-report` step now uses `docker.io/andgineer/allure:2.36.0` (root-based image).
- The step now follows the same retained-log pattern used by other pipelines in this workspace: write `ci-logs/allure-report.txt` in workspace, print it to job output, and keep it only on failure.
- Allure generation is executed via `/opt/allure-2.36.0/bin/allure generate ...`, preserving report behavior while avoiding the insecure-registry pull issue.

## Validation

- `podman pull host.containers.internal:5000/allure-cli:2.24.1` reproduces ticketed failure: `http: server gave HTTP response to HTTPS client`.
- `podman pull docker.io/andgineer/allure:2.36.0` succeeds.
- `podman run --rm docker.io/andgineer/allure:2.36.0 sh -lc 'id -u; /opt/allure-2.36.0/bin/allure --version'` confirms root execution and available Allure CLI (`2.36.0`).
- `npm run test:allure:unit` succeeds in `scroller-front-end-poc/` (5 suites passed).

## Changed Files

- `.woodpecker.yml`: switched allure-report job image to `docker.io/andgineer/allure:2.36.0` and restored workspace `ci-logs` capture flow used by other stable pipelines.
- `documentation/tickets/codex/pro-167-investigate-and-fix-problem-with-scroller-front-end-poc-ci-on-main.md`: ticket artifact with evidence, root cause, fix, and validation.
