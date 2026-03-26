# PRO-130-move-scroller-front-end-poc-port-to-8410

## Ticket Snapshot

- Identifier: PRO-130
- Title: move scroller-front-end-poc port to 8410
- URL: https://linear.app/property-app/issue/PRO-130/move-scroller-front-end-poc-port-to-8410
- Branch: PRO-130-move-scroller-front-end-poc-port-to-8410

## Source Requirements

### Description

Scroller Front-End POC was still configured around legacy localhost ports that conflicted with active Finder workflows. The service must move to `8410` consistently across local app runtime, automated test wiring, container/deployment manifests, health checks, and docs/default URL config.

### Key Comments and Acceptance Criteria

- Scroller Front-End POC must be reachable on `http://localhost:8410` through supported run/deploy workflows.
- Existing Scroller Front-End POC references to legacy ports should be replaced by `8410` in active runtime/test/deploy/doc wiring.
- Automated test configuration must target `http://localhost:8410`.

## Architecture Impact

- Updated the Next.js app runtime contract to treat `8410` as the default exposed app port across both development (`next dev`) and production startup (`next start`/container `PORT`).
- Realigned Podman container runtime and kube manifest host/container/service/probe ports on `8410` to remove the prior split across legacy values.
- Updated CI deploy health-check wiring to probe the same `8410` endpoint used by runtime exposure.

## Functional Changes

- Switched app defaults and tests to `http://localhost:8410` (`package.json`, Playwright config, env example, request URL fixtures).
- Switched container/deployment wiring to `8410` in `Containerfile`, `Makefile`, and `podman-scroller-kube.yaml`.
- Updated operator-facing docs and retained ticket history docs to remove stale Scroller legacy-port references.

## Validation

- `cd scroller-front-end-poc && rg -n "8410" Makefile README.md podman-scroller-kube.yaml .woodpecker.yml scroller-front-end-poc/package.json scroller-front-end-poc/playwright.config.ts scroller-front-end-poc/Containerfile scroller-front-end-poc/.env.example`
- `cd scroller-front-end-poc/scroller-front-end-poc && npm test -- --passWithNoTests`
- `cd scroller-front-end-poc/scroller-front-end-poc && npm run build`

## Changed Files

- `.woodpecker.yml`: Updated deploy health check URL to `http://host.containers.internal:8410`.
- `Makefile`: Moved Podman host port + health check defaults and deployment messaging to `8410`; updated container port mapping.
- `README.md`: Updated default local app URL to `http://localhost:8410`.
- `podman-scroller-kube.yaml`: Aligned host/container/service/probe ports to `8410`.
- `scroller-front-end-poc/.env.example`: Updated `NEXT_PUBLIC_APP_URL` default to `http://localhost:8410`.
- `scroller-front-end-poc/Containerfile`: Updated `PORT` env and exposed container port to `8410`.
- `scroller-front-end-poc/package.json`: Updated `dev` and `start` scripts to bind to `8410`.
- `scroller-front-end-poc/playwright.config.ts`: Updated web server and base URL to `http://localhost:8410`.
- `scroller-front-end-poc/src/app/api/auth/logout/route.test.ts`: Updated test URL host/port to `8410`.
- `scroller-front-end-poc/src/app/api/stack-rank/route.test.ts`: Updated test URL host/port to `8410`.
- `documentation/tickets/PRO-104-empty-nextjs-scaffold.md`: Replaced stale Scroller port reference with `8410`.
- `documentation/tickets/PRO-105-create-default-makefile-targets.md`: Replaced stale deployment port references with `8410`.
- `documentation/tickets/PRO-129-ci-build-push-deploy-main.md`: Replaced stale CI health-check port references with `8410`.
- `documentation/tickets/PRO-130-move-scroller-front-end-poc-port-to-8410.md`: Added ticket implementation artifact.
