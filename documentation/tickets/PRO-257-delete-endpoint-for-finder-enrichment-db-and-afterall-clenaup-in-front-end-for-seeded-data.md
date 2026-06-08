# PRO-257-delete-endpoint-for-finder-enrichment-db-and-afterall-clenaup-in-front-end-for-seeded-data

## Ticket Snapshot

- Identifier: PRO-257
- Title: delete endpoint for finder-enrichment-db and afterAll clenaup in front end for seeded data
- URL: https://linear.app/property-app/issue/PRO-257/delete-endpoint-for-finder-enrichment-db-and-afterall-clenaup-in-front
- Branch: PRO-257-delete-endpoint-for-finder-enrichment-db-and-afterall-clenaup-in-front-end-for-seeded-data

## Source Requirements

### Description

Add front-end Playwright teardown that removes only the fixed `E2E Seed Listing`
created by `ensureSeededScrollerImages`, using `GET /api/listings/external_url/`
to resolve the enrichment-db id and `DELETE /api/listings/{id}` to remove it.
Cleanup must be best-effort, idempotent, and must not delete the estate agent.

### Key Comments and Acceptance Criteria

- The strict scroller feed E2E may seed a fixed listing with a stable
  `external_url`.
- `afterAll` resolves that listing and calls the new enrichment-db delete route.
- Missing seed listings are a no-op.
- Cleanup leaves the seed estate agent untouched.

## Architecture Impact

- `tests/helpers/enrichment-db.ts` now owns both setup and teardown for the
  enrichment-db seed listing used by strict feed tests.
- The teardown runs from Playwright's Node side, using environment-provided
  enrichment-db URL and API key; no browser-exposed secrets are introduced.

## Functional Changes

- `deleteSeededScrollerListing()` looks up the fixed seed listing by
  `external_url` and deletes that listing id only.
- The helper treats lookup `404` and delete `404` as successful no-ops.
- Other lookup/delete failures are logged with `console.warn` and do not fail
  the suite because teardown is explicitly best-effort.
- `tests/login.spec.ts` registers the helper in `test.afterAll`.

## Validation

- `npm run test:e2e:ci -- --list` (pass: 3 Chromium specs listed)
- `npx tsc --noEmit` (fails on pre-existing jest-dom matcher typings in
  component tests and the existing Playwright `Response` typing in
  `tests/login.spec.ts`; no new helper-specific type errors were reported)

## Changed Files

- `scroller-front-end-poc/tests/helpers/enrichment-db.ts`: added idempotent best-effort seed listing teardown.
- `scroller-front-end-poc/tests/login.spec.ts`: registered teardown with `test.afterAll`.
- `README.md`: documented enrichment-db E2E env vars and cleanup behavior.
