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
    │   └── app/
    │       ├── layout.tsx
    │       ├── page.tsx
    │       └── globals.css
    ├── package.json
    ├── next.config.mjs
    ├── tsconfig.json
    └── tailwind.config.js
```
