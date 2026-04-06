import { expect, test } from '@playwright/test';
import { loginAndExpectAuthenticated } from './helpers/login';
import { getCustomerImageInteractions, waitForNewInteraction } from './helpers/scroller-customer-interactions-db';

test('pre-deploy login check passes with valid credentials', async ({ page }) => {
  const user = await loginAndExpectAuthenticated(page);
  await expect(page.getByRole('img')).toBeVisible();

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

  await expect(page.getByRole('img')).toBeVisible();
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
