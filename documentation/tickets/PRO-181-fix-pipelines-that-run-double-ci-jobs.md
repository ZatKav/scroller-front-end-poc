# PRO-181-fix-pipelines-that-run-double-ci-jobs

## Ticket Snapshot

- Identifier: PRO-181
- Title: Fix pipelines that run double ci jobs
- URL: https://linear.app/property-app/issue/PRO-181/fix-pipelines-that-run-double-ci-jobs
- Branch: PRO-181-fix-pipelines-that-run-double-ci-jobs

## Source Requirements

### Description

Audit Finder Woodpecker CI configuration and remove automatic non-main branch push validation so a commit on a pull request branch does not create both pull request and push validation workflows.

### Key Comments and Acceptance Criteria

- Pull request updates should run the pull request validation workflow only.
- Pushes to `main` must keep release, publish, and deployment behavior.
- Existing manual Woodpecker runs must remain available.
- Main-only publish and deploy behavior must pair `event: push` with `branch: main`.

## Architecture Impact

- `.woodpecker.yml` now uses one workflow-level expression for `pull_request`, `manual`, or `push` to `main`.
- Unit and E2E test step filters no longer include broad `push` events.
- Existing build, deploy, and post-deploy smoke filters remain push-main scoped.

## Functional Changes

- Unit and E2E validation remains available for pull requests and manual runs.
- Non-main branch pushes no longer run a duplicate automatic validation workflow.
- Main branch pushes still run tests, build/push the image, deploy, run the host smoke check, and publish reports.

## Validation

- `ruby -ryaml -e 'ARGV.each { |path| YAML.load_file(path) }' /tmp/pro181-woodpecker-worktrees/*/.woodpecker.yml`
- `git diff --check`
- Trigger scan confirmed remaining push events are push-main gates or the workflow-level expression.

## Changed Files

- `.woodpecker.yml`: narrowed automatic workflow trigger and removed broad push events from validation step filters.
- `documentation/tickets/PRO-181-fix-pipelines-that-run-double-ci-jobs.md`: captured ticket implementation notes.
