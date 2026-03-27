import { test } from '@playwright/test';
import { loginAndExpectAuthenticated } from './helpers/login';

test('post-deploy host login smoke passes with valid credentials', async ({ page }) => {
  await loginAndExpectAuthenticated(page);
});
