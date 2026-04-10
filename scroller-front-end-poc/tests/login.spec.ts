import { expect, test, type Response } from '@playwright/test';
import { loginAndExpectAuthenticated } from './helpers/login';
import { getCustomerImageInteractions, waitForNewInteraction } from './helpers/scroller-customer-interactions-db';

function isStackRankWindowResponse(response: Response, skip: number, limit: number): boolean {
  const url = new URL(response.url());
  return (
    url.pathname === '/api/stack-rank'
    && url.searchParams.get('skip') === String(skip)
    && url.searchParams.get('limit') === String(limit)
    && response.request().method() === 'GET'
  );
}

test('pre-deploy login check passes with valid credentials', async ({ page }) => {
  const firstWindowResponsePromise = page.waitForResponse(
    (response) => isStackRankWindowResponse(response, 0, 1),
    { timeout: 30000 },
  );

  const nextWindowResponsePromise = page.waitForResponse(
    (response) => isStackRankWindowResponse(response, 1, 3),
    { timeout: 30000 },
  );

  const user = await loginAndExpectAuthenticated(page);
  const firstWindowResponse = await firstWindowResponsePromise;
  expect(
    firstWindowResponse.ok(),
    `Expected first /api/stack-rank window to return 2xx, got ${firstWindowResponse.status()}.`,
  ).toBeTruthy();

  const firstWindowBody = await firstWindowResponse.json() as { images?: unknown };
  expect(Array.isArray(firstWindowBody.images)).toBeTruthy();
  expect((firstWindowBody.images as unknown[]).length).toBeGreaterThanOrEqual(1);

  const nextWindowResponse = await nextWindowResponsePromise;
  expect(
    nextWindowResponse.ok(),
    `Expected follow-up /api/stack-rank window to return 2xx, got ${nextWindowResponse.status()}.`,
  ).toBeTruthy();

  const nextWindowBody = await nextWindowResponse.json() as { images?: unknown };
  expect(Array.isArray(nextWindowBody.images)).toBeTruthy();
  expect((nextWindowBody.images as unknown[]).length).toBeGreaterThanOrEqual(1);

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
