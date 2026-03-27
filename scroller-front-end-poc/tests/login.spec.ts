import { test } from '@playwright/test';
import { loginAndExpectAuthenticated } from './helpers/login';

test('pre-deploy login check passes with valid credentials', async ({ page }) => {
  await loginAndExpectAuthenticated(page);
});
