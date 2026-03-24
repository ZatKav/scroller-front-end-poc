# PRO-106: Create woodpecker ci setup

## Summary
Added a Woodpecker CI pipeline to scroller-front-end-poc with two required test stages (unit and e2e) that must pass before the build-and-push step runs. The pipeline mirrors the finder-evaluation-dashboard setup. A Containerfile was added for building the Next.js app as a minimal production container using a standalone build. The playwright config was updated with a webServer entry so e2e tests can spin up the dev server automatically in CI.

## Changes
- `.woodpecker.yml`: New pipeline with `test-unit`, `test-e2e`, and `build-and-push` stages. The build-and-push step depends on both test stages and only runs on push to main.
- `scroller-front-end-poc/Containerfile`: Multi-stage container build — builder stage runs `npm ci` + `npm run build`; runner stage copies the standalone output for a minimal production image.
- `scroller-front-end-poc/next.config.mjs`: Added `output: 'standalone'` to enable the standalone build used by the Containerfile.
- `scroller-front-end-poc/playwright.config.ts`: Added `webServer` configuration so Playwright starts `npm run dev` automatically during e2e test runs in CI.

## Tests
- Ran: `make test-dashboard-unit` in `scroller-front-end-poc`
- Result: Pass (no tests yet, exits 0 via `--passWithNoTests`)

## Documentation updated
- `documentation/tickets/PRO-106-create-woodpecker-ci-setup.md`: This file.

## Open questions
- None.
