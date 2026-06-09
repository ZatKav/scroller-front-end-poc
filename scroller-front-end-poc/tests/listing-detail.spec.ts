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
