# PRO-109-create-front-end-client-for-scroller-customer-interactions-db

## Ticket Snapshot

- Identifier: PRO-109
- Title: Create front end client for scroller-customer-interactions-db
- URL: https://linear.app/property-app/issue/PRO-109/create-front-end-client-for-scroller-customer-interactions-db
- Branch: PRO-109-create-front-end-client-for-scroller-customer-interactions-db

## Source Requirements

### Description

Create a TypeScript client in `scroller-front-end-poc` for `scroller-customer-interactions-db` covering customer interactions read/create and stack-rank retrieval, following the existing Next.js proxy pattern so API keys remain server-side.

### Key Comments and Acceptance Criteria

- Add a TypeScript client that supports:
  - `getCustomerImageInteractions`
  - `createCustomerImageInteraction`
  - `getStackRankImages`
  - `healthCheck`
- Add a Next.js proxy route that forwards `GET` and `POST` calls to the backend using a `?path=` query parameter and injects the API key.
- Add TypeScript interfaces mirroring backend Pydantic models (`CustomerImageInteractionCreate`, `CustomerImageInteraction`, `StackRankImage`) including `action: 0 | 1`.
- Document required environment variables:
  - `SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL`
  - `SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY`
- Add unit tests that mock `fetch` for client success and failure scenarios, including APIError propagation for non-2xx responses.

## Architecture Impact

- Added a server-side proxy integration boundary at `src/app/api/scroller-customer-interactions-db` so browser components only call internal Next.js routes.
- Added a dedicated frontend API client module in `src/app/shared/clients` to centralize backend request construction, error handling, and typed contracts.
- Added shared API contract types in `src/types/scroller-customer-interactions-db.ts` to keep frontend request/response modeling aligned with backend schemas.

## Functional Changes

- Added proxy `GET` and `POST` handlers for forwarding backend API requests via `?path=`.
- Added a proxy health route to support frontend health checks without exposing backend credentials.
- Added a strongly typed frontend API client with methods for interactions read/create and stack-rank retrieval.
- Added `APIError` behavior for non-2xx and network failures so calling components can handle status-aware errors.
- Confirmed there were no existing direct backend fetches in this repository to replace.

## Validation

- `cd scroller-front-end-poc && npm test -- --runInBand src/app/shared/clients/scroller-customer-interactions-db-api-client.test.ts`
- `cd scroller-front-end-poc && npm run build`

## Changed Files

- `scroller-front-end-poc/src/types/scroller-customer-interactions-db.ts`: Added typed request/response interfaces mirroring backend schemas.
- `scroller-front-end-poc/src/app/api/scroller-customer-interactions-db/route.ts`: Added server-side proxy route with API key injection for GET/POST.
- `scroller-front-end-poc/src/app/api/scroller-customer-interactions-db/health/route.ts`: Added server-side health probe endpoint.
- `scroller-front-end-poc/src/app/shared/clients/scroller-customer-interactions-db-api-client.ts`: Added typed API client and `APIError` handling.
- `scroller-front-end-poc/src/app/shared/clients/scroller-customer-interactions-db-api-client.test.ts`: Added unit coverage for methods and error handling.
- `scroller-front-end-poc/.env.example`: Documented required backend base URL and API key variables.
- `README.md`: Documented new proxy/client architecture and updated project structure.
