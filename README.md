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

The app will be available at [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp scroller-front-end-poc/.env.example scroller-front-end-poc/.env.local
```

Required backend proxy variables:

- `SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL` (default `http://localhost:8300`)
- `SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY`

## Scroller customer interactions DB client

The app now includes a dedicated TypeScript API client and server-side proxy route for all
`scroller-customer-interactions-db` traffic:

- Client: `scroller-front-end-poc/src/app/shared/clients/scroller-customer-interactions-db-api-client.ts`
- Proxy route: `scroller-front-end-poc/src/app/api/scroller-customer-interactions-db/route.ts`
- Proxy health route: `scroller-front-end-poc/src/app/api/scroller-customer-interactions-db/health/route.ts`
- Types: `scroller-front-end-poc/src/types/scroller-customer-interactions-db.ts`

The browser only calls internal Next.js API routes. API keys are injected server-side in the proxy handler.

## Testing

```bash
# Unit tests
make test-dashboard-unit

# E2E tests (requires running dev server)
make test-dashboard-e2e

# All tests
make test
```

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
