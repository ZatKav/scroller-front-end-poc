# PRO-107: Create login page

## Summary

Added a login page to `scroller-front-end-poc` mirroring the authentication pattern from `finder-evaluation-dashboard`. The implementation includes hardcoded users (jack and phil with bcrypt-hashed passwords), JWT cookie-based authentication, an `AuthContext` React context, a `ProtectedRoute` guard component, and a matching login page UI. All API routes are forced to the Node.js runtime to avoid edge-runtime incompatibility with `jsonwebtoken`.

## Changes

- `data/users.json`: Hardcoded user store with two users (jack, phil) and bcrypt-hashed passwords
- `src/lib/auth.ts`: `generateToken`, `verifyToken`, `authenticateUser`, `getUserByUsername` using `jsonwebtoken` and `bcryptjs`; reads `JWT_SECRET_KEY` from env with fallback and production warning
- `src/contexts/AuthContext.tsx`: `AuthProvider` with `user`, `loading`, `login`, `logout`; calls `/api/auth/me` on mount to restore session
- `src/components/ProtectedRoute.tsx`: Client component that redirects to `/login` when unauthenticated
- `src/app/api/auth/login/route.ts`: `POST` — validates credentials, sets HTTP-only `auth-token` cookie (30-day maxAge)
- `src/app/api/auth/logout/route.ts`: `POST` — clears `auth-token` cookie
- `src/app/api/auth/me/route.ts`: `GET` — verifies `auth-token` cookie and returns user object
- `src/app/login/page.tsx`: Login page with username/password form, error display, loading state, and redirect if already authenticated
- `src/app/layout.tsx`: Wrapped `{children}` with `<AuthProvider>`
- `.env.example`: Added `JWT_SECRET_KEY=your-secret-here`
- `package.json`: Added `jsonwebtoken`, `bcryptjs` and their `@types/*` packages

## Tests

- Ran: `npm test` in `scroller-front-end-poc`
- Result: Pass (no tests found, `--passWithNoTests` set)
- TypeScript: `npx tsc --noEmit` — no errors

## Documentation updated

- `documentation/tickets/PRO-107-create-login-page.md`: This file

## Open questions

- None
