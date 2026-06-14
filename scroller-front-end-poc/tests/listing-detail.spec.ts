import { expect, test } from '@playwright/test';
import { loginAndExpectAuthenticated } from './helpers/login';
import {
  deleteSeededDetailListing,
  ensureSeededDetailListing,
} from './helpers/enrichment-db';

test.afterAll(async () => {
  await deleteSeededDetailListing();
});

test('renders the detail page for a seeded listing', async ({ page }) => {
  test.setTimeout(60000);

  // The detail page is its own protected route; we do not need the scroller feed
  // image, so skip that assertion in the login helper.
  await loginAndExpectAuthenticated(page, { expectScrollerImage: false });

  // Seed a fully-renderable listing directly in enrichment-db (idempotent) so
  // the test does not depend on ambient data, and key the navigation on its id.
  const { id } = await ensureSeededDetailListing();

  await page.goto(`/listing/${id}`);

  await expect(
    page.getByRole('heading', { name: 'E2E Detail Seed Listing' }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('listing-price')).toHaveText('£450,000');
  await expect(page.getByTestId('carousel-image').first()).toBeVisible();
});

test('opens listing discovery from the detail page entry point', async ({ page }) => {
  test.setTimeout(60000);

  await loginAndExpectAuthenticated(page, { expectScrollerImage: false });
  const { id } = await ensureSeededDetailListing();

  await page.goto(`/listing/${id}`);
  await page.getByRole('link', { name: 'Show me something else' }).click();

  await expect(page).toHaveURL(/\/listings(?:\/\d+)?$/);
});

test('carousel swipes stay on the current listing detail page', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Synthetic touch swipe regression runs in Chromium.');
  test.setTimeout(60000);

  await loginAndExpectAuthenticated(page, { expectScrollerImage: false });
  const { id } = await ensureSeededDetailListing();
  const interactionRequests: string[] = [];

  page.on('request', (request) => {
    const url = request.url();
    if (
      url.includes('/api/customer-image-interactions') ||
      url.includes('/api/customer-listing-interactions')
    ) {
      interactionRequests.push(url);
    }
  });

  await page.goto(`/listing/${id}`);
  await expect(page.getByTestId('carousel-image')).toBeVisible();
  await expect(page.getByTestId('carousel-status')).toHaveText('Image 1 of 3');

  const swipeCarousel = async (deltaX: number) => {
    await page.getByTestId('carousel-viewport').evaluate((element, dx) => {
      const rect = element.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      element.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [new Touch({ identifier: 1, target: element, clientX: startX, clientY: startY })],
        }),
      );
      element.dispatchEvent(
        new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          changedTouches: [
            new Touch({
              identifier: 1,
              target: element,
              clientX: startX + dx,
              clientY: startY,
            }),
          ],
        }),
      );
    }, deltaX);
  };

  await swipeCarousel(-160);
  await expect(page.getByTestId('carousel-status')).toHaveText('Image 2 of 3');
  await expect(page).toHaveURL(new RegExp(`/listing/${id}$`));

  await swipeCarousel(160);
  await expect(page.getByTestId('carousel-status')).toHaveText('Image 1 of 3');
  await expect(page).toHaveURL(new RegExp(`/listing/${id}$`));
  expect(interactionRequests).toEqual([]);
});
