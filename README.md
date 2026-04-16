# scroller-front-end-poc

A Next.js front-end proof of concept for the Finder property listings platform.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
cd scroller-front-end-poc
npm install
```

## Running locally

```bash
# From repo root
make run

# Or directly
cd scroller-front-end-poc && npm run dev
```

The app will be available at [http://localhost:8410](http://localhost:8410).

## Environment variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp scroller-front-end-poc/.env.example scroller-front-end-poc/.env.local
```

Required backend proxy variables:

- `SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL` (default `http://localhost:8400`)
- `SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY` (must match `API_KEY` in `scroller-customer-interactions-db`)
- `JWT_SECRET_KEY` (required for auth routes and login checks)

CI/deploy login checks also require:

- `E2E_LOGIN_USERNAME` (defaults to `jack` in CI)
- `E2E_LOGIN_PASSWORD` (defaults to `jackNgrok2026!` in CI)
- `SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL` (for direct Playwright Node-side verification calls)
- `SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY` (required by both Next proxy routes and direct Playwright verification calls)

## Scroller customer interactions DB client

The app now includes a dedicated TypeScript API client and server-side proxy route for all
`scroller-customer-interactions-db` traffic:

- Client: `scroller-front-end-poc/src/app/shared/clients/scroller-customer-interactions-db-api-client.ts`
- Proxy route: `scroller-front-end-poc/src/app/api/scroller-customer-interactions-db/route.ts`
- Proxy health route: `scroller-front-end-poc/src/app/api/scroller-customer-interactions-db/health/route.ts`
- Types: `scroller-front-end-poc/src/types/scroller-customer-interactions-db.ts`

The browser only calls internal Next.js API routes. API keys are injected server-side in the proxy handler.

After login, the protected scroller page loads stack-rank images progressively through the internal
`/api/stack-rank` route: first 1 image, then the next 3, then the next 10. The first image is rendered
as soon as the first window returns. Once the local queue falls to 10 remaining cards, the page starts
a staged refill of the next 3 cards and then the next 7 while keeping the current card actionable; any
refill failure leaves the buffered queue intact and shows a short failure message. The page keeps a
browser-side queue of fetched images, and the internal route keeps a server-side session cache keyed by
user so repeated or over-returned windows can be served without another
`scroller-customer-interactions-db` call when the requested ordinal range is already cached.

## Testing

```bash
# Unit tests
make test-dashboard-unit

# E2E tests (requires running dev server)
make test-dashboard-e2e

# All tests
make test
```

CI-specific test commands used by Woodpecker:

- `npm run test:allure:unit` emits unit-test Allure results (`scroller-front-end-poc/allure-results-unit`).
- `npm run test:e2e:ci` runs the pre-deploy login + scroller interaction Playwright check on Chromium against a local app server and emits e2e Allure results (`scroller-front-end-poc/allure-results-e2e`).
- `npm run test:e2e:deploy-smoke` runs the post-deploy host login smoke check against `http://host.containers.internal:8410`.

## Podman deployment

Canonical deploy command for both operators and CI:

```bash
make podman-deploy
```

What it does:

- pulls `host.containers.internal:5000/scroller-front-end-poc:latest` with local-registry TLS disabled
- removes any legacy standalone `scroller-front-end-poc-local` container before redeploying the pod manifest `podman-scroller-kube.yaml` (pod name `pod_scroller_front_end`)
- waits for health at `PODMAN_HEALTHCHECK_URL` (`http://localhost:8410` by default)

Legacy command names are retained as compatibility aliases and now call the canonical target:

- `make podman-start`
- `make podman-ci-deploy`
- `make podman-deploy-ci`

For CI main deploy, `.woodpecker.yml` uses `make podman-deploy` with
`PODMAN_HEALTHCHECK_URL=http://host.containers.internal:8410`.

Default seeded login credentials for local/CI checks:

- Username `jack` / Password `jackNgrok2026!`
- Username `phil` / Password `manager123`

The previous Jack default password (`password123`) is intentionally retired and should fail login.
If you need to rotate Jack again before exposing a public endpoint, update:

- `scroller-front-end-poc/data/users.json` (bcrypt hash)
- `.woodpecker.yml` and any local `E2E_LOGIN_PASSWORD` overrides

For ticket-driven branch handoff, rotate this value before branch push if a different owner-managed Jack password is required.

## Public ngrok access for the scroller front end

Run the app first so ngrok has a healthy local target:

```bash
make run
```

Start a public tunnel to port `8410`:

```bash
make scroller-ngrok-start
```

Get the active URL and status:

```bash
make scroller-ngrok-url
make scroller-ngrok-status
```

Stop the public tunnel when done:

```bash
make scroller-ngrok-stop
```

Optional overrides:

- `SCROLLER_NGROK_PORT` (defaults to `8410`)
- `SCROLLER_NGROK_HEALTHCHECK_URL` (defaults to `http://localhost:$SCROLLER_NGROK_PORT/login`)
- `SCROLLER_NGROK_API_URL` (defaults to `http://localhost:4040/api/tunnels`)

## CI report and log artifacts

- `.woodpecker.yml` now includes `allure-report` and `store-report-locally` post-run stages that execute on both successful and failed pipelines.
- Combined Allure HTML output is published to `/reports/${CI_REPO}/${CI_COMMIT_BRANCH}/${CI_COMMIT_SHA}/index.html`, and `latest` is updated per branch.
- Only retained problem-stage logs are copied into `/reports/${CI_REPO}/${CI_COMMIT_BRANCH}/${CI_COMMIT_SHA}/ci-logs/`; logs from successful stages are deleted before artifact storage.

## Project structure

```
scroller-front-end-poc/   # Root workspace
├── Makefile
├── README.md
└── scroller-front-end-poc/   # Next.js app workspace
    ├── src/
    │   ├── app/
    │   │   ├── api/scroller-customer-interactions-db/
    │   │   │   ├── route.ts
    │   │   │   └── health/route.ts
    │   │   ├── shared/clients/
    │   │   │   ├── scroller-customer-interactions-db-api-client.ts
    │   │   │   └── scroller-customer-interactions-db-api-client.test.ts
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   └── globals.css
    │   └── types/
    │       └── scroller-customer-interactions-db.ts
    ├── package.json
    ├── next.config.mjs
    ├── tsconfig.json
    └── tailwind.config.js
```
