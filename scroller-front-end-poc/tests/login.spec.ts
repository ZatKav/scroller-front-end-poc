import { expect, test } from '@playwright/test';
import { loginAndExpectAuthenticated } from './helpers/login';
import { getCustomerImageInteractions, waitForNewInteraction } from './helpers/scroller-customer-interactions-db';

test('pre-deploy login check passes with valid credentials', async ({ page }) => {
  const stackRankResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/stack-rank' && response.request().method() === 'GET';
  }, { timeout: 30000 });

  const user = await loginAndExpectAuthenticated(page);
  const stackRankResponse = await stackRankResponsePromise;
  expect(
    stackRankResponse.ok(),
    `Expected /api/stack-rank to return 2xx, got ${stackRankResponse.status()}.`,
  ).toBeTruthy();

  const stackRankBody = await stackRankResponse.json() as { images?: unknown };
  expect(Array.isArray(stackRankBody.images)).toBeTruthy();
  expect((stackRankBody.images as unknown[]).length).toBeGreaterThanOrEqual(2);

  const scrollerImage = page.getByTestId('scroller-image');
  await expect(scrollerImage).toBeVisible({ timeout: 15000 });

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

  await expect(scrollerImage).toBeVisible({ timeout: 15000 });
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
