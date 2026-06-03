import { test } from '@playwright/test';
import { expectEntryRedirectsToLogin, loginAndExpectAuthenticated } from './helpers/login';

test('post-deploy entry path redirects to login without a duplicated base path', async ({ page }) => {
  await expectEntryRedirectsToLogin(page);
});

test('post-deploy host login smoke lands on the protected scroller page', async ({ page }) => {
  await loginAndExpectAuthenticated(page);
});
