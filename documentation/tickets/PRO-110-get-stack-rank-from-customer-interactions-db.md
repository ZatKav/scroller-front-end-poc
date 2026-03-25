# PRO-110: Get stack rank from customer-interactions-db

## Summary
Adds a server-side API route (`GET /api/stack-rank`) to the `scroller-front-end-poc` application. When called by an authenticated client, the route validates the session, fetches the current stack-rank image list from `scroller-customer-interactions-db`, stores the result in a server-managed in-memory session store keyed by user ID, and returns a success response. Upstream failures return a deterministic 502 without overwriting any previously stored session data.

## Changes
- `scroller-front-end-poc/src/lib/stack-rank-client.ts`: Typed HTTP helper that calls `GET /api/images/stack-rank` on `scroller-customer-interactions-db`. Exports `fetchStackRankImages()` and `StackRankClientError` for deterministic error mapping.
- `scroller-front-end-poc/src/lib/stack-rank-session.ts`: Server-side in-memory session store (`Map<userId, StackRankImage[]>`). Exports `getStackRank(userId)` and `setStackRank(userId, images)`.
- `scroller-front-end-poc/src/app/api/stack-rank/route.ts`: Next.js App Router API route handler. Validates `auth-token` cookie, calls the client helper, persists images to the session store on success, and returns 401/502/500 on failure.
- `scroller-front-end-poc/src/app/api/stack-rank/route.test.ts`: Jest unit tests covering authentication failure, success with session persistence, and upstream failure with session preservation.

## Tests
- Ran: `make test-dashboard-unit` in `scroller-front-end-poc`
- Result: 14 passed (2 suites — new route tests + existing client tests)

## Documentation updated
None — no architecture or functional docs required changes for this ticket.

## Open questions
- The in-memory session store is cleared on server restart; a persistent session store (e.g. Redis) should be considered before production use.
- Display/rendering of the stored stack-rank data is out of scope for this ticket (deferred to a follow-on ticket).
