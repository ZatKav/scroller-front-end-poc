import { test } from '@playwright/test';
import {
  expectAuthenticatedEntryRendersScroller,
  expectEntryRedirectsToLogin,
  expectListingsPageRendered,
  loginAndExpectAuthenticated,
} from './helpers/login';

// This deploy smoke runs against a deployed host with no interactions-DB
// credentials and no guarantee of seeded image data (the enrichment-db feed
// source can be redeployed/wiped independently). Its job is to verify auth,
// the protected-route redirect behaviour, and that the scroller page renders —
// NOT that a specific image is present. So it asserts the scroller rendered
// (image or the valid "No more images" empty state) rather than requiring an
// image, which would otherwise hard-fail purely because the shared feed is
// empty. The login.spec.ts feed/swipe tests keep the strict image assertion;
// they reset the user's interactions against a seeded local feed first.

test('post-deploy entry path redirects to login without a duplicated base path', async ({ page }) => {
  await expectEntryRedirectsToLogin(page);
});

test('post-deploy host login smoke lands on the protected listings flow', async ({ page }) => {
  await loginAndExpectAuthenticated(page, { expectScrollerImage: false });
  await expectListingsPageRendered(page);
});

test('authenticated direct navigation to the entry path renders the scroller', async ({ page }) => {
  await loginAndExpectAuthenticated(page, { expectScrollerImage: false });
  await expectAuthenticatedEntryRendersScroller(page);
});
