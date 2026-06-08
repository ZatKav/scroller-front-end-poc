# PRO-254: [FE-4] Build reusable listing image carousel component

## Summary
Added a standalone, reusable `ListingImageCarousel` component for the listing
detail page image gallery. It is presentation-only — it records nothing, exposes
no Like/Skip, and makes no API calls (this is what separates it from
`ImageScroller`). It renders an ordered set of listing images supplied via props,
supports touch swipe, paging dots and left/right keyboard navigation, renders
base64 image data safely (including already-prefixed `data:` URIs), filters out
images with missing data, and keeps a fixed aspect-ratio viewport so changing
images never shifts surrounding content. Wiring it into the detail page is FE-3
and is out of scope here.

## Changes
- `src/components/ListingImageCarousel.tsx`: new client component. Local
  `CarouselImage` / props types (no enrichment-db dependency); renderable set
  filtered on `image_data`; `currentIndex` state clamped on navigation and when
  the prop shrinks; swipe gesture reusing `ImageScroller`'s thresholds
  (`SWIPE_MIN_DISTANCE_PX=60`, `SWIPE_HORIZONTAL_RATIO=1.5`), single-touch guard
  and ghost-click suppression, mapped to prev/next; `ArrowLeft`/`ArrowRight`
  keyboard navigation; fixed `aspect-[4/3]` viewport with `object-contain`;
  labelled, focusable paging dots (hidden when ≤1 renderable image); `role=status`
  position announcement; clean placeholder for the empty/all-missing case. The
  data-URI expression is a copied one-liner mirroring `ImageScroller.tsx:418` —
  `ImageScroller` was not modified and no shared util was introduced.
- `src/components/ListingImageCarousel.test.tsx`: new unit tests (18) covering
  mount/first image + dots, dot navigation, swipe left/right, short/vertical drag
  rejection, ghost-click suppression, keyboard navigation, end clamping, raw vs
  prefixed data URIs, alt fallback, missing-data filter, single-image (no dots),
  empty list and all-missing placeholder, prop-shrink clamping, and stable
  aspect-ratio framing.

## Tests
- Ran: `npx jest src/components/ListingImageCarousel.test.tsx` in
  `scroller-front-end-poc/scroller-front-end-poc` → 18 passed.
- Ran: `npm test` (full unit suite) → 17 suites, 141 tests passed, no regressions.
- `npm run lint`: not run — `next lint` is unconfigured in this repo and drops
  into an interactive setup prompt; ESLint is not part of the project setup.

## Documentation updated
- `documentation/tickets/PRO-254-fe-4-reusable-listing-image-carousel.md`: this
  snapshot.
- README project-structure block intentionally left unchanged: it does not
  enumerate individual components (it omits `src/components/` and the existing
  `ImageScroller`), so listing only the carousel there would be inconsistent.

## Open questions
- None. FE-3 will consume `ListingImageCarousel` and replace the existing gallery
  placeholder in `(protected)/listing/[id]/page.tsx`; the aspect ratio (`4/3`)
  and the generic `"Listing image"` alt fallback can be revisited there against
  the mockup if needed.
