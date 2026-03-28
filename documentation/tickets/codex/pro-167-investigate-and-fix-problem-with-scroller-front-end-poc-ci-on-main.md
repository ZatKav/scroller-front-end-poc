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

- `.woodpecker.yml` `allure-report` step now uses `docker.io/frankescobar/allure-docker-service:2.27.0`.
- `.woodpecker.yml` `allure-report` step writes diagnostics directly to job stdout/stderr instead of `ci-logs/allure-report.txt`, avoiding workspace permission errors in restricted runtimes.
- Allure report generation behavior is preserved (`allure generate ...`) while preventing the HTTPS-to-HTTP registry protocol mismatch during image pull.

## Validation

- `podman pull host.containers.internal:5000/allure-cli:2.24.1` reproduces ticketed failure: `http: server gave HTTP response to HTTPS client`.
- `podman pull docker.io/frankescobar/allure-docker-service:2.27.0` succeeds.
- `npm run test:allure:unit` succeeds in `scroller-front-end-poc/` (5 suites passed).
- `podman run --rm -v "$REPO":/work -w /work docker.io/frankescobar/allure-docker-service:2.27.0 sh -lc 'allure generate allure-results --clean -o allure-report && test -f allure-report/index.html && allure --version'` succeeds.
- Follow-up CI failure addressed: `/bin/sh: cannot create ci-logs/allure-report.txt: Permission denied` by removing file redirection and using direct job logs.

## Changed Files

- `.woodpecker.yml`: switched allure-report job image to public Docker Hub image and removed file-based ci-log redirection in favor of direct step logs.
- `documentation/tickets/codex/pro-167-investigate-and-fix-problem-with-scroller-front-end-poc-ci-on-main.md`: ticket artifact with evidence, root cause, fix, and validation.
