# PRO-104: Create empty next js scaffold

## Summary

Bootstrapped `scroller-front-end-poc` as an empty but runnable Next.js TypeScript scaffold, mirroring the structural conventions of `finder-evaluation-dashboard`. The repository follows a root workflow layer (Makefile, README, .gitignore) plus one nested app workspace named `scroller-front-end-poc`. The nested workspace contains a Next.js App Router + TypeScript project with Tailwind CSS, Jest, and Playwright wired up but no test spec files added. All configuration is safe by default — no secrets or real API keys are committed.

## Changes

- `.gitignore`: Root-level git ignore covering node_modules, .next, build artefacts, env files (allows `.env.example`), Playwright output, and editor folders.
- `Makefile`: Root workflow layer with `run`, `test-dashboard-unit`, `test-dashboard-e2e`, and `test` targets; no container targets per ticket scope.
- `README.md`: Setup, run, test, and project structure documentation.
- `scroller-front-end-poc/package.json`: Next.js 15 + React 18 with Tailwind, clsx, tailwind-merge, lucide-react; Jest and Playwright dev dependencies; `--passWithNoTests` flag on test script so CI passes before specs are added.
- `scroller-front-end-poc/next.config.mjs`: Minimal Next.js config (no standalone output to keep things simple for a PoC).
- `scroller-front-end-poc/tsconfig.json`: Strict TypeScript config with `@/*` path alias.
- `scroller-front-end-poc/tailwind.config.js`: Tailwind config with dark mode, custom font/shadow/radius tokens — matches evaluation-dashboard conventions.
- `scroller-front-end-poc/postcss.config.mjs`: tailwindcss + autoprefixer.
- `scroller-front-end-poc/jest.config.js`: next/jest wrapper with jsdom environment, `@/` module alias, coverage thresholds, Playwright test exclusion.
- `scroller-front-end-poc/jest.setup.js`: next/router and next/navigation mocks, global fetch mock.
- `scroller-front-end-poc/playwright.config.ts`: Three-browser (chromium, firefox, webkit) Playwright config targeting localhost:8410.
- `scroller-front-end-poc/.env.example`: Placeholder env file; no real values.
- `scroller-front-end-poc/src/app/layout.tsx`: Root App Router layout with Inter font and metadata.
- `scroller-front-end-poc/src/app/page.tsx`: Minimal placeholder home page.
- `scroller-front-end-poc/src/app/globals.css`: Tailwind directives + CSS custom properties + base component styles matching evaluation-dashboard conventions.

## Tests

- Ran: `npm run build` in `scroller-front-end-poc` — Result: pass (static build, 2 routes)
- Ran: `npm test` in `scroller-front-end-poc` — Result: pass (no test files, `--passWithNoTests`)

## Documentation updated

- `README.md`: New file documenting setup, run, test commands, and project structure.
- `documentation/tickets/PRO-104-empty-nextjs-scaffold.md`: This ticket snapshot.

## Open questions

- None — all acceptance criteria met. Container files and test spec files are intentionally deferred to follow-up tickets per the clarified requirements.
