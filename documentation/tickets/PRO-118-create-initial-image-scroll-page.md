# PRO-118: Create initial image scroll page

## Summary
Implemented the image scroll page that loads after login. The protected home page now fetches stack-rank images and displays them one at a time with Like and Skip buttons. Interactions are recorded to scroller-customer-interactions-db. Images with null image_data are filtered out server-side.

## Changes
- `scroller-front-end-poc/src/app/api/stack-rank/route.ts`: Updated to filter out images with null `image_data` and return the filtered images array in the response body alongside `{ ok: true }`.
- `scroller-front-end-poc/src/components/ImageScroller.tsx`: New client component that displays the current image, renders Like/Skip buttons, posts interaction records, disables buttons during submission, and shows an empty state when all images are exhausted.
- `scroller-front-end-poc/src/app/(protected)/page.tsx`: Converted to a client component that fetches images from `/api/stack-rank` on mount, shows a loading state, and renders the `ImageScroller` with the authenticated user's ID.
- `scroller-front-end-poc/src/components/ImageScroller.test.tsx`: Unit tests covering rendering, like/skip interactions, empty state, alt text fallback, and button disabling during submission.
- `scroller-front-end-poc/src/app/api/stack-rank/route.test.ts`: Updated existing test to verify null `image_data` filtering and that images are returned in the response.

## Tests
- Ran: `make test` in `scroller-front-end-poc`
- Result: 5 test suites, 26 tests passed

## Documentation updated
- `documentation/tickets/PRO-118-create-initial-image-scroll-page.md`: This ticket snapshot.

## Open questions
- None
