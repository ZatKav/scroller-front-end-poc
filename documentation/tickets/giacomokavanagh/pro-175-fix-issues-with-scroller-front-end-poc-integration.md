# giacomokavanagh/pro-175-fix-issues-with-scroller-front-end-poc-integration

## Ticket Snapshot

- Identifier: PRO-175
- Title: Fix issues with scroller-front-end-poc integration
- URL: https://linear.app/property-app/issue/PRO-175/fix-issues-with-scroller-front-end-poc-integration
- Branch: giacomokavanagh/pro-175-fix-issues-with-scroller-front-end-poc-integration

## Source Requirements

### Description

Get the environment variable changes made while fixing the `scroller-front-end-poc` integration into the deployment flow.

### Key Comments and Acceptance Criteria

- `scroller-front-end-poc` must receive the scroller customer interactions DB base URL and API key at runtime.
- The frontend defaults must target the local `scroller-customer-interactions-db` service on port 8400.
- Runtime warnings for a missing `SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY` should not appear when the Podman manifest is applied.

## Architecture Impact

- Adds the scroller customer interactions DB runtime configuration to the Podman deployment boundary for `scroller-front-end-poc`.
- Keeps the API key as runtime configuration in the Podman manifest rather than baking it into the container image.
- Aligns server-side proxy clients with the `scroller-customer-interactions-db` service port.

## Functional Changes

- The deployed frontend can authenticate to `scroller-customer-interactions-db` using `SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY`.
- The frontend stack-rank and proxy routes now default to `http://localhost:8400` for local development.
- The container image includes `curl` so Podman-generated HTTP probes can execute.
- The Podman health checks target `/login` on `pod_scroller_front_end` to avoid redirect and host mismatch failures.

## Validation

- `npm test -- --runInBand`
- Manual runtime checks confirmed login succeeds and the missing `SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY` warning is resolved after redeploying the local pod from the manifest.

## Changed Files

- `README.md`: Documented that the frontend API key must match the backend `API_KEY`.
- `podman-scroller-kube.yaml`: Added scroller DB runtime env vars and adjusted health probes.
- `scroller-front-end-poc/.env.example`: Updated local scroller DB port defaults.
- `scroller-front-end-poc/Containerfile`: Added `curl` for container health checks.
- `scroller-front-end-poc/src/app/api/scroller-customer-interactions-db/health/route.ts`: Updated the default upstream base URL.
- `scroller-front-end-poc/src/app/api/scroller-customer-interactions-db/route.ts`: Updated the default upstream base URL and request-time missing-key handling.
- `scroller-front-end-poc/src/lib/stack-rank-client.ts`: Updated the default stack-rank upstream base URL.
