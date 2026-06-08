# PRO-253: [FE-2] Add authenticated listing-detail BFF proxy and enrichment client

## Summary

Added the scroller front-end server-side data path for listing detail reads from
finder-enrichment-db. A new BFF route `GET /api/listings/[id]` verifies the app
`auth-token` cookie locally before doing any upstream work, then proxies to
enrichment-db through a server-side client that injects the upstream API key as a
Bearer header (never exposed to the browser). Upstream outcomes are mapped to
stable, leak-free FE responses. This follows the `/api/stack-rank/route.ts`
pattern rather than the generic `scroller-customer-interactions-db` proxy, which
forwards the upstream key with no local auth check. Scope is the data path only;
the detail page UI and field mapping are FE-3.

## Changes

- `src/app/api/listings/[id]/route.ts` (new): `GET` BFF handler, `dynamic = 'force-dynamic'`.
  Auth flow — missing cookie → 401, failed `verifyToken` → 401. Validates the id
  (`^[1-9]\d*$` + `Number.isSafeInteger`) → 400 before any upstream call. Maps
  `EnrichmentDbConfigError` → 500 (server misconfig), `EnrichmentDbClientError.status === 404`
  → 404, any other client error (incl. network) → 502, unexpected → 500. Logs
  detail server-side; the 200 body is the enrichment-db listing passed through verbatim.
- `src/lib/enrichment-db-client.ts` (new): `fetchListingDetail(id)` +
  `EnrichmentDbClientError extends Error { status }` + `EnrichmentDbConfigError`.
  Reads `ENRICHMENT_DB_BASE_URL` (default `http://localhost:8200`) and
  `ENRICHMENT_DB_API_KEY`; a missing key throws `EnrichmentDbConfigError` (→ 500)
  before any request, so a deploy misconfiguration is distinct from an upstream
  outage. Injects the Bearer header server-side, `cache: 'no-store'`, wraps network
  errors as status 0, and throws with the upstream status on non-2xx. Mirrors
  `stack-rank-client.ts`.
- `src/types/enrichment-db.ts` (new): minimal loose `ListingDetail`
  (`{ id: number; [k: string]: unknown }`) to insulate FE-2 from the EDB-2 /
  EDB-6 payload-shape change landing later.
- `.env.example`: added `ENRICHMENT_DB_BASE_URL` / `ENRICHMENT_DB_API_KEY`.
- `src/lib/enrichment-db-client.test.ts` (new): happy path (bearer header + no-store),
  404, 5xx, network error, missing-key config error (no request made), and
  default-base-url cases (mock `fetch`).
- `src/app/api/listings/[id]/route.test.ts` (new): 401 (no cookie / invalid token,
  no upstream call), 400 for malformed ids (incl. an overflow id exercising the
  `Number.isSafeInteger` guard), 200 pass-through, 404, 502 (upstream 5xx + no-leak
  assertion), 502 (network), 500 (server misconfig, no-leak), 500 (unexpected).

## Tests

- Ran: `npx jest` in `scroller-front-end-poc` (the repo uses `npm test` / jest, not `make`).
- Result: PASS — 18 suites, 142 tests. New work: 19 tests across the two new suites.
- Ran: `npm run build` — PASS; `/api/listings/[id]` registered as a dynamic route.

## Review remediation (PR #51)

- **Suggestion — missing `ENRICHMENT_DB_API_KEY` surfaced as 502:** now throws
  `EnrichmentDbConfigError` before any request and the route maps it to 500, so a
  deploy misconfiguration is distinguishable from a genuine upstream outage.
- **Nit — `Number.isSafeInteger` guard untested:** added an overflow id
  (`99999999999999999999`) to the 400 cases to exercise that branch.

## Documentation updated

- `.env.example`: documents the new enrichment-db env vars (the canonical env doc
  for this repo). The cross-service plan (`documentation/tickets/listing-details-page-plan.md`,
  in the finder monorepo root — a separate repo) already lists these vars in the
  FE-2 section, so no change is made there from this PR.
- `documentation/tickets/PRO-253-fe-2-listing-detail-bff-proxy.md`: this snapshot.

## Open questions

- None. EDB-2 dependency is non-blocking for FE-2: the route works against today's
  `GET /api/listings/{id}`; EDB-2 only enriches the payload shape, which the loose
  `ListingDetail` type tolerates.
