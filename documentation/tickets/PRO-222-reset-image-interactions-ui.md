# PRO-222: Reset image_interactions for user (front-end)

## Summary
Added a "Reset my interactions" control to the scroller front-end that lets the logged-in customer delete all of their own image interactions. The button sits directly below the Skip / Like row in `ImageScroller`, has a red (destructive) style, and requires an explicit confirmation dialog before anything is deleted. It calls a new `DELETE` proxy route which forwards to the `scroller-customer-interactions-db` `DELETE /api/customer-image-interactions/{customer_id}` endpoint (delivered in the companion backend PR). Success shows the number of removed rows; failure shows an error and leaves interactions untouched.

## Changes
- `src/components/ImageScroller.tsx`: added the red `Reset my interactions` button below the Skip/Like row, a `window.confirm` gate, `resetting`/`resetMessage` state, and success/error/zero-row feedback (`role="status"`).
- `src/app/shared/clients/scroller-customer-interactions-db-api-client.ts`: added `deleteCustomerImageInteractions(customerId)` returning `{ deleted: number }`.
- `src/app/api/scroller-customer-interactions-db/route.ts`: added a `DELETE` handler mirroring the existing `GET` proxy (api-key check, path validation, upstream error propagation).
- `src/components/ImageScroller.test.tsx`: added reset-flow tests (button present, confirm→delete+count, cancel→no request, zero-row message, error message).
- `src/app/shared/clients/scroller-customer-interactions-db-api-client.test.ts`: added delete client tests (success count, error propagation).
- `src/app/api/scroller-customer-interactions-db/route.test.ts` (new): tests for the DELETE proxy (forwarding, missing path → 400, missing api key → 500, upstream status propagation).

## Tests
- Ran: `npm test` (jest) in `scroller-front-end-poc/scroller-front-end-poc`
- Result: **53 passed, 8 suites** — all green. (Console error lines in output are expected logs asserted by negative-path tests.)
- E2E (`npm run test:e2e`) not run; no Playwright flow was added for this change.

## Documentation updated
- None beyond this ticket snapshot — the front-end repo keeps only `documentation/tickets/` and has no architecture doc covering component behavior.

## Open questions
- Button is rendered in the active scroller view (below Skip/Like). When the image queue is exhausted ("No more images") the early-return branch hides it, matching the requested placement; surfacing a reset on the exhausted/empty state was not requested.
