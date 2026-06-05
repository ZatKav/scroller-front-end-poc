import { expect, test } from '@playwright/test';
import { loginAndExpectAuthenticated } from './helpers/login';
import {
  deleteCustomerImageInteractions,
  getCustomerImageInteractions,
  waitForNewInteraction,
} from './helpers/scroller-customer-interactions-db';

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

  // The smoke test Likes and Skips images, which permanently records
  // interactions for this user. The scroller only serves images the user has
  // not yet interacted with, so without a reset the queue depletes across runs
  // until the page shows "No more images" and the scroller-image assertion
  // below fails. Reset this user's interactions and reload so the scroller
  // always starts from a fresh, fully-populated queue.
  await deleteCustomerImageInteractions(user.id);
  await page.reload();
  await expect(page.getByTestId('scroller-image')).toBeVisible();

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

// Dispatch a single-finger horizontal swipe across the scroller image by firing
// real touchstart/touchend events in the page. The component reads the start and
// changed-touch coordinates, so a start + end pair is enough to drive the
// gesture. Touch event/constructor support is reliable in Chromium, so the
// swipe regression is pinned to that project (see test.skip below).
async function swipeScrollerImage(
  page: import('@playwright/test').Page,
  deltaX: number,
): Promise<void> {
  await page.getByTestId('scroller-swipe-area').evaluate((element, dx) => {
    const rect = element.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    const makeTouch = (clientX: number) =>
      new Touch({ identifier: 1, target: element, clientX, clientY: startY });

    element.dispatchEvent(
      new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [makeTouch(startX)],
        changedTouches: [makeTouch(startX)],
      }),
    );
    element.dispatchEvent(
      new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        changedTouches: [makeTouch(startX + dx)],
      }),
    );
  }, deltaX);
}

test('mobile swipes record persisted Like and Skip interactions', async ({ page, browserName }) => {
  // Touch event synthesis is exercised against Chromium, which mirrors the
  // mobile WebView/Chrome the scroller targets; webkit/firefox touch-constructor
  // support is inconsistent across CI images.
  test.skip(browserName !== 'chromium', 'Swipe regression runs on Chromium only.');
  test.setTimeout(60000);

  const user = await loginAndExpectAuthenticated(page);

  // Reset first so the queue is fully populated regardless of prior runs, exactly
  // like the button-based smoke above.
  await deleteCustomerImageInteractions(user.id);
  await page.reload();

  const scrollerImage = page.getByTestId('scroller-image');
  await expect(scrollerImage).toBeVisible({ timeout: 30000 });

  const existingInteractions = await getCustomerImageInteractions(user.id);
  const knownIds = new Set(existingInteractions.map((interaction) => interaction.id));

  // Swipe right -> Like.
  await swipeScrollerImage(page, 160);
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

  // Swipe left -> Skip, on the next image.
  await swipeScrollerImage(page, -160);
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
