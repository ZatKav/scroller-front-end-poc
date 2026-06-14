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
- `ENRICHMENT_DB_BASE_URL` and `ENRICHMENT_DB_API_KEY` (required by strict scroller feed E2E seeding and teardown)

## Scroller customer interactions DB client

The app now includes a dedicated TypeScript API client and server-side proxy route for all
`scroller-customer-interactions-db` traffic:

- Client: `scroller-front-end-poc/src/app/shared/clients/scroller-customer-interactions-db-api-client.ts`
- Proxy route: `scroller-front-end-poc/src/app/api/scroller-customer-interactions-db/route.ts`
- Proxy health route: `scroller-front-end-poc/src/app/api/scroller-customer-interactions-db/health/route.ts`
- Types: `scroller-front-end-poc/src/types/scroller-customer-interactions-db.ts`

The browser only calls internal Next.js API routes. API keys are injected server-side in the proxy handler.

After login, the protected scroller page loads stack-rank images through the internal
`/api/stack-rank` route in customer-aware continuation mode. It requests one image first so the initial
card renders quickly, then preloads larger continuation batches (`limit=10`) while the customer scrolls.
When the queue is nearly exhausted, the page asks for the next unseen customer-specific cards and
deduplicates by image id before appending. The internal route sends the authenticated user id upstream
as `customer_id`, does not replay cached ordinal windows, and only shows terminal `No more images` once
the upstream continuation returns no renderable unseen cards. Continuation failures keep already buffered
cards intact and show `More images could not be loaded.`.

Under each image the page also renders the raw stack-rank weights as JSON for debugging: the
per-customer `profile_weights` map produced by the ranking algorithm plus the current card's
`final_score` and `selection_reason`. These come from the `/api/stack-rank` envelope
(`{ images, profile_weights }`) and refresh per batch fetch, so the weights visibly update as the
customer likes/skips images and new continuation batches load. A cold-start customer with no
interaction history shows an empty `{}` profile.

The app also exposes a protected listing review flow alongside the image scroller:

- `GET /api/listings/stack-rank` is an authenticated BFF route that verifies the app session, sends the
  signed-in user id upstream as `customer_id`, and keeps the interactions-db API key server-side.
- `/listings` loads the signed-in customer's listing stack-rank queue and updates the browser URL to
  `/listings/{listing_id}` as soon as the first ranked listing is selected. With `NEXT_PUBLIC_BASE_PATH=/scroller`,
  those routes are served as `/scroller/listings` and `/scroller/listings/{listing_id}`.
- `/listings/[id]` keeps direct navigation inside the same flow by server-rendering the addressed listing
  detail first, then hydrating the queue for the next ranked listings.
- The listing flow renders listing detail content through the same `ListingDetailContent` and
  `mapListingToView` path as the standalone `/listing/[id]` detail route.
- `Skip` and `Like` persist listing preferences through `POST /customer-listing-interactions` with
  `action` values `0` and `1`, then advance to the next queued listing.
- The bottom `Delete preferences` control deletes only listing interactions through
  `DELETE /customer-listing-interactions/{customer_id}` after the interactions proxy verifies the signed-in
  customer id, then reloads the listing stack-rank queue; image preferences and the image scroller reset
  behavior are unchanged.
- `src/lib/stack-rank-client.ts` contains the server-side client for the upstream
  `/api/listings/stack-rank` endpoint.
- `src/lib/listing-stack-rank-queue.ts` contains the queue contract: deduplicate ranked listings by
  `listing.id`, expose one current listing plus three preloaded listings, represent empty responses, and
  preserve the existing current listing when a later preload fails.

The backwards-compatible standalone detail route remains available at `/listing/[id]`.
It includes a `Show me something else` link to `/listings`, allowing a user who
lands on an individual listing to enter the ranked listing discovery flow without
prepending the deployed `/scroller` base path in source code.

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

The strict login/scroller Playwright spec seeds a fixed `E2E Seed Listing` in
finder-enrichment-db before exercising the feed, then deletes only that listing
in `afterAll`. The delete cascades the seed images/floorplans in enrichment-db
and intentionally leaves the estate agent untouched.

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
- Username `phil` / Password `letbigphilin`

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

If Woodpecker already has an ngrok endpoint running, use a separate reserved scroller URL:

```bash
SCROLLER_NGROK_URL=https://<your-second-ngrok-url> make scroller-ngrok-start
```

The scroller helper uses ngrok's local agent API on `127.0.0.1:4041` by default so it can run alongside the Woodpecker tunnel on `4040`.
Do not use `--pooling-enabled` for this case; that load-balances the same public URL instead of creating a separate front-end URL.

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
- `SCROLLER_NGROK_WEB_ADDR` (defaults to `127.0.0.1:4041`)
- `SCROLLER_NGROK_API_URL` (defaults to `http://$SCROLLER_NGROK_WEB_ADDR/api/tunnels`)
- `SCROLLER_NGROK_URL` (optional reserved ngrok URL for a second public endpoint)

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
    │   │   ├── (protected)/listings/
    │   │   │   ├── page.tsx
    │   │   │   └── [id]/page.tsx
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
