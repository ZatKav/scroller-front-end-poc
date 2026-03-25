# PRO-107: Create login page

## Summary

Added a login page to `scroller-front-end-poc` mirroring the authentication pattern from `finder-evaluation-dashboard`. The implementation includes hardcoded users (jack and phil with bcrypt-hashed passwords), JWT cookie-based authentication, an `AuthContext` React context, a layout-level `ProtectedRoute` guard, and a matching login page UI. Authentication now requires `JWT_SECRET_KEY` to be configured before login or session verification routes can run, rather than falling back to a shared default secret.

## Changes

- `data/users.json`: Hardcoded user store with two users (jack, phil) and bcrypt-hashed passwords
- `src/lib/auth.ts`: `generateToken`, `verifyToken`, `authenticateUser`, `getUserByUsername` using `jsonwebtoken` and `bcryptjs`; requires `JWT_SECRET_KEY`, validates decoded JWT payloads, and keeps token lifetime aligned with the auth cookie
- `src/contexts/AuthContext.tsx`: `AuthProvider` with `user`, `loading`, `login`, `logout`; calls `/api/auth/me` on mount to restore session
- `src/components/ProtectedRoute.tsx`: Client component applied from the shared layout that allows `/login` but redirects unauthenticated users away from protected routes
- `src/app/api/auth/login/route.ts`: `POST` — validates credentials, sets an HTTP-only `auth-token` cookie on `/`, and returns only the public user fields
- `src/app/api/auth/logout/route.ts`: `POST` — clears `auth-token` cookie
- `src/app/api/auth/me/route.ts`: `GET` — verifies `auth-token` cookie and returns user object
- `src/app/login/page.tsx`: Login page with username/password form, error display, session-check loading state, and redirect if already authenticated
- `src/app/layout.tsx`: Wrapped the app with `<AuthProvider>` and `<ProtectedRoute>` so non-login pages require an authenticated session
- `.env.example`: Added `JWT_SECRET_KEY=your-secret-here`
- `package.json`: Added `jsonwebtoken`, `bcryptjs` and their `@types/*` packages

## Tests

- Ran: `npm test -- --runInBand` in `scroller-front-end-poc/scroller-front-end-poc`
- Result: Pass (no tests found, `--passWithNoTests` set)
- Build: `npm run build` — pass

## Documentation updated

- `documentation/tickets/PRO-107-create-login-page.md`: This file

## Open questions

- None
