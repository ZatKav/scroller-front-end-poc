# PRO-179-customer-interactions-dont-see-to-include-duration-viewed-in-milliseconds

## Ticket Snapshot

- Identifier: PRO-179
- Title: Customer-interactions don't see to include duration viewed in milliseconds
- URL: https://linear.app/property-app/issue/PRO-179/customer-interactions-dont-see-to-include-duration-viewed-in
- Branch: PRO-179-customer-interactions-dont-see-to-include-duration-viewed-in-milliseconds

## Source Requirements

### Description

Scroller customer-image interactions for Like/Skip were being created with `view_duration_ms: null`.
The ticket requires frontend measurement of per-image view duration and persistence of a non-null integer duration for both actions, plus Playwright coverage that verifies persisted rows directly against `scroller-customer-interactions-db` using Node-side credentials.

### Key Comments and Acceptance Criteria

- Like action must continue to persist as action `1`, and Skip as action `0`.
- Each persisted interaction must include a non-null integer `view_duration_ms`.
- Duration must be measured per displayed image (timer reset when image advances).
- Playwright flow must login, Like first image, verify persisted action `1` + duration, Skip next image, verify persisted action `0` + duration.
- API credentials must stay in Playwright/CI Node-side environment, not browser context.

## Architecture Impact

- `ImageScroller` now owns per-image duration measurement (`Date.now()` at image display + delta on action submit).
- Playwright E2E now includes a Node-side helper (`tests/helpers/scroller-customer-interactions-db.ts`) that calls backend API directly using environment-provided base URL and API key.
- CI E2E pipeline wiring now sets backend base URL for pre-deploy Playwright checks to reach host-side `scroller-customer-interactions-db`.

## Functional Changes

- Like/Skip create payloads now include `view_duration_ms` as a non-negative integer.
- Duration timer resets when advancing to the next image, ensuring per-image timing semantics.
- Login Playwright spec now verifies persisted Like (`1`) and Skip (`0`) interactions each have non-null integer duration and that Skip applies to a different image than Like.
- Login helper returns authenticated user details so tests can query records for the correct customer ID.

## Validation

- `npm run test -- src/components/ImageScroller.test.tsx` (pass)
- Playwright E2E DB-backed flow implemented but not executed in this run (requires running backend and API key in environment).

## Follow-up CI Stabilization (2026-04-07)

- CI signal: `test-e2e` failed in `tests/login.spec.ts` because `getByRole('img')` matched two elements in strict mode (the scroller image and a Next.js devtools SVG).
- Minimal fix: narrowed the E2E image visibility selector to `page.locator('img[src^="data:image"]').first()` and reused it for both pre-Like and pre-Skip assertions.
- Supporting validation in this run:
  - `npm run test -- src/components/ImageScroller.test.tsx` (pass)
  - `npx playwright test --project=chromium tests/login.spec.ts --list` (pass; test discovery)
  - Full browser execution remains environment-blocked locally (Playwright browser install/launch constraints in sandbox), so CI is used as source of truth for the final run.

## Follow-up CI Stabilization (2026-04-07, second pass)

- CI signal: the narrowed `img[src^="data:image"]` selector still failed because no matching element was found within timeout.
- Root cause: selector depended on a specific `src` format, which is not guaranteed at the moment of assertion in CI.
- Minimal fix:
  - Added `data-testid="scroller-image"` to the rendered scroller `<img>` in `ImageScroller`.
  - Updated Playwright login spec to use `page.getByTestId('scroller-image')` for both visibility checks.
- Supporting validation in this run:
  - `npm run test -- src/components/ImageScroller.test.tsx` (pass)
  - `npx playwright test --project=chromium tests/login.spec.ts --list` (pass; test discovery)
  - Full browser execution remains environment-blocked locally, so CI run on branch is the definitive validation.

## Changed Files

- `.woodpecker.yml`: wired E2E backend base URL for pre-deploy Playwright run.
- `README.md`: documented new E2E dependency on interactions DB env vars and updated CI E2E test description.
- `scroller-front-end-poc/src/components/ImageScroller.tsx`: added per-image duration tracking and payload field `view_duration_ms`.
- `scroller-front-end-poc/src/components/ImageScroller.test.tsx`: added duration assertions and per-image timer reset coverage.
- `scroller-front-end-poc/tests/helpers/login.ts`: returns authenticated user object from login response for downstream DB assertions.
- `scroller-front-end-poc/tests/helpers/scroller-customer-interactions-db.ts`: new Node-side direct API helper + polling wait for new interaction records.
- `scroller-front-end-poc/tests/login.spec.ts`: extended login check to Like/Skip actions with persisted action/duration verification.
- `scroller-front-end-poc/tests/login.spec.ts` (follow-up): narrowed scroller image locator to avoid Playwright strict-mode collisions with non-scroller image-role elements in CI.
- `scroller-front-end-poc/src/components/ImageScroller.tsx` (follow-up): added stable `data-testid` on scroller image for E2E targeting.
- `scroller-front-end-poc/tests/login.spec.ts` (second follow-up): switched visibility assertions to `getByTestId('scroller-image')`.
