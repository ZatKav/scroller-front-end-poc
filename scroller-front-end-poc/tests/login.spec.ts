import { expect, test } from '@playwright/test';
import { loginAndExpectAuthenticated } from './helpers/login';
import { getCustomerImageInteractions, waitForNewInteraction } from './helpers/scroller-customer-interactions-db';

const RETIRED_JACK_PASSWORD = 'password123';

function isStackRankWindowResponse(response: Response, skip: number, limit: number): boolean {
  const url = new URL(response.url());
  return (
    url.pathname === '/api/stack-rank'
    && url.searchParams.get('skip') === String(skip)
    && url.searchParams.get('limit') === String(limit)
    && response.request().method() === 'GET'
  );
}

test('retired default jack password is rejected', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login(?:[/?#].*)?$/);

  await page.getByLabel('Username').fill('jack');
  await page.getByLabel('Password').fill(RETIRED_JACK_PASSWORD);

  const loginResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/auth/login' && response.request().method() === 'POST';
  });

  await page.getByRole('button', { name: /sign in/i }).click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.status()).toBe(401);
  await expect(page).toHaveURL(/\/login(?:[/?#].*)?$/);
  await expect(page.getByText('Invalid username or password')).toBeVisible();

  const authTokenCookie = (await page.context().cookies())
    .find((cookie) => cookie.name === 'auth-token');
  expect(authTokenCookie).toBeUndefined();
});

test('pre-deploy login check passes with valid credentials', async ({ page }) => {
  test.setTimeout(60000);

  const user = await loginAndExpectAuthenticated(page);
  const scrollerImage = page.getByTestId('scroller-image');
  await expect(scrollerImage).toBeVisible({ timeout: 30000 });

  const existingInteractions = await getCustomerImageInteractions(user.id);
  const knownIds = new Set(existingInteractions.map((interaction) => interaction.id));

  await page.getByRole('button', { name: 'Like' }).click();
  const likeInteraction = await waitForNewInteraction({
    customerId: user.id,
    expectedAction: 1,
    knownIds,
  });
  knownIds.add(likeInteraction.id);

  expect(likeInteraction.action).toBe(1);
  expect(likeInteraction.view_duration_ms).not.toBeNull();
  expect(Number.isInteger(likeInteraction.view_duration_ms)).toBeTruthy();

  await expect(scrollerImage).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Skip' }).click();
  const skipInteraction = await waitForNewInteraction({
    customerId: user.id,
    expectedAction: 0,
    knownIds,
  });

  expect(skipInteraction.action).toBe(0);
  expect(skipInteraction.view_duration_ms).not.toBeNull();
  expect(Number.isInteger(skipInteraction.view_duration_ms)).toBeTruthy();
  expect(skipInteraction.image_id).not.toBe(likeInteraction.image_id);
});
