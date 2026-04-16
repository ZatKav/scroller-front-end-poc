# PRO-192-make-an-ngrok-endpoint-for-the-front-end

## Ticket Snapshot

- Identifier: PRO-192
- Title: Make an ngrok endpoint for the front end
- URL: https://linear.app/property-app/issue/PRO-192/make-an-ngrok-endpoint-for-the-front-end
- Branch: PRO-192-make-an-ngrok-endpoint-for-the-front-end

## Source Requirements

### Description

Expose the scroller front end through an ngrok HTTPS URL that forwards to the existing app service on port `8410`, without bypassing the current login boundary. Retire the previous default Jack password, update test/docs credential references, and provide repeatable operator commands for ngrok start/status/url/stop.

### Key Comments and Acceptance Criteria

- Starting ngrok should report a public HTTPS URL that reaches the scroller app.
- Unauthenticated visitors opening the public URL must be presented with login and not protected content.
- The retired default Jack password (`password123`) must fail authentication.
- The configured (owner-updated) Jack password must authenticate through the public URL.
- Operators need deterministic start/status/url/stop commands for the scroller tunnel.
- Start flow must fail clearly if ngrok is missing, the local app is not healthy, or no URL is available from `http://localhost:4040/api/tunnels`.

## Architecture Impact

- Added a scroller-specific ngrok operator surface in repo-level shell scripts and Make targets, reusing the finder-infra tunnel control pattern but scoped to port `8410`.
- Added a machine-readable tunnel URL resolver script that filters ngrok tunnels by configured scroller port from the local ngrok API.
- No auth boundary changes were made; existing cookie-backed route protection remains the only entry to protected UI.

## Functional Changes

- Jack's seeded password hash and CI/E2E default credential references are rotated from `password123` to `jackNgrok2026!`.
- Playwright coverage now explicitly verifies that `jack/password123` is rejected and no `auth-token` cookie is created.
- New Make targets (`scroller-ngrok-start`, `scroller-ngrok-status`, `scroller-ngrok-url`, `scroller-ngrok-stop`) now provide repeatable public endpoint operations.
- README now documents the full ngrok operator flow and credential rotation points.

## Validation

- `npm run test:e2e:ci -- --grep "retired default jack password is rejected|pre-deploy login check passes with valid credentials"`
- `make scroller-ngrok-status`

## Changed Files

- `Makefile`: Added scroller-ngrok targets and configurable ngrok variables.
- `scripts/get_scroller_ngrok_url.sh`: Added strict tunnel URL resolution for the configured scroller port.
- `scripts/start_scroller_ngrok.sh`: Added ngrok start workflow with dependency, local health, and URL-readiness checks.
- `scripts/stop_scroller_ngrok.sh`: Added controlled tunnel shutdown with PID/process handling.
- `scroller-front-end-poc/data/users.json`: Rotated Jack password hash.
- `scroller-front-end-poc/tests/helpers/login.ts`: Updated default E2E Jack password.
- `scroller-front-end-poc/tests/login.spec.ts`: Added retired password rejection coverage.
- `.woodpecker.yml`: Updated CI and deploy-smoke default Jack password.
- `README.md`: Documented ngrok operator flow and updated credential defaults.
