# PRO-252-fe-1-add-protected-listing-id-route-scaffold

## Ticket Snapshot

- Identifier: PRO-252
- Title: [FE-1] Add protected /listing/[id] route scaffold
- URL: https://linear.app/property-app/issue/PRO-252/fe-1-add-protected-listingid-route-scaffold
- Branch: PRO-252-fe-1-add-protected-listing-id-route-scaffold

## Source Requirements

### Description

Create a scaffold-only protected listing detail route in `scroller-front-end-poc`
at `/listing/[id]`. The route must live under the existing `(protected)` route
group, inherit the established auth behavior, render a placeholder detail shell,
validate malformed listing ids with `notFound()`, and avoid backend/client data
fetching until FE-2.

### Key Comments and Acceptance Criteria

- Authenticated users can reach `/listing/[id]`; unauthenticated users are
  redirected by the existing protected layout and client wrapper.
- The route reads the enrichment-db integer listing id from Next 15 async
  `params` and rejects non-positive or malformed ids with the not-found state.
- Success, loading, error, and not-found states are covered by unit tests.
- Internal navigation links use the existing base-path helper so deployed
  `/scroller` links are not double-prefixed.

## Architecture Impact

- Added a new App Router segment under
  `src/app/(protected)/listing/[id]/`, so listing detail pages inherit the
  current server cookie auth check in `(protected)/layout.tsx` and the
  `ProtectedRoute` client wrapper.
- Kept the page as a server component with no BFF proxy, enrichment-db client,
  environment variable, or contract changes. FE-2 can replace the placeholder
  content with server-loaded listing data without moving the route.

## Functional Changes

- `/listing/123` renders a listing detail scaffold headed `Listing #123` with an
  image-gallery placeholder and a small facts placeholder row.
- `/listing/not-a-number`, `/listing/0`, negative ids, and decimal ids call
  `notFound()` before rendering page content.
- `loading.tsx` provides a route-level skeleton/spinner fallback.
- `error.tsx` provides a client error boundary with a retry button that calls
  `reset()` and a base-path-safe `Back to feed` link.
- `not-found.tsx` provides friendly missing-listing content and a base-path-safe
  `Back to feed` link.

## Validation

- Passed: `npm test -- --runTestsByPath 'src/app/(protected)/listing/[id]/page.test.tsx' 'src/app/(protected)/listing/[id]/loading.test.tsx' 'src/app/(protected)/listing/[id]/error.test.tsx' 'src/app/(protected)/listing/[id]/not-found.test.tsx'`
  - 4 suites, 9 tests passing.
- Passed: `npm test`
  - 16 suites, 122 tests passing. Existing console warnings remain in older API
    and `ImageScroller` tests.
- Passed: `npm run build`
  - Next production build succeeds and includes dynamic route `/listing/[id]`.
- Not runnable as a non-interactive check: `npm run lint`
  - `next lint` prompts to configure ESLint for this repo.
- Known pre-existing limitation: `npx tsc --noEmit`
  - Fails on existing jest-dom matcher typings in `src/components/ImageScroller.test.tsx`
    and existing Playwright response typings in `tests/login.spec.ts`. The new
    listing route files do not appear in the final failure output.

## Changed Files

- `src/app/(protected)/listing/[id]/page.tsx`: server route scaffold with
  positive-integer id validation and placeholder listing UI.
- `src/app/(protected)/listing/[id]/loading.tsx`: loading skeleton fallback.
- `src/app/(protected)/listing/[id]/error.tsx`: client error boundary with retry
  and feed navigation.
- `src/app/(protected)/listing/[id]/not-found.tsx`: not-found route state with
  feed navigation.
- `src/app/(protected)/listing/[id]/page.test.tsx`: success and malformed-id
  coverage.
- `src/app/(protected)/listing/[id]/loading.test.tsx`: loading fallback coverage.
- `src/app/(protected)/listing/[id]/error.test.tsx`: error message, retry, and
  feed-link coverage.
- `src/app/(protected)/listing/[id]/not-found.test.tsx`: not-found content and
  feed-link coverage.
- `documentation/tickets/PRO-252-fe-1-add-protected-listing-id-route-scaffold.md`:
  implementation snapshot.
