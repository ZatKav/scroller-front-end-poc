import { expect, test } from '@playwright/test';
import { loginAndExpectAuthenticated } from './helpers/login';
import {
  deleteSeededScrollerListing,
  ensureSeededScrollerImages,
} from './helpers/enrichment-db';
import {
  deleteCustomerImageInteractions,
  getCustomerImageInteractions,
  waitForNewInteraction,
} from './helpers/scroller-customer-interactions-db';

// FE-5 (PRO-256): the scroller card exposes a "View listing" overlay that links
// to the listing detail route keyed on the enrichment-db listing id the card
// carries. Seeded stack-rank cards always have a listing_id, so the control is
// present on the feed these tests drive.

// Captured on login so afterAll can clear the interactions these tests record;
// left-over interactions poison the shared user's stack-rank preference profile
// and reference seed images that the listing teardown below deletes.
let interactionsCleanupUserId: number | undefined;

test.afterAll(async () => {
  if (interactionsCleanupUserId !== undefined) {
    try {
      await deleteCustomerImageInteractions(interactionsCleanupUserId);
    } catch (error) {
      console.warn(
        `E2E interactions cleanup failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  await deleteSeededScrollerListing();
});

test('view-listing control navigates to the listing detail route', async ({ page }) => {
  test.setTimeout(60000);

  // Defer the scroller-image assertion until after the reset below (the queue
  // can be exhausted by prior runs); see login.spec.ts for the rationale.
  const user = await loginAndExpectAuthenticated(page, { expectScrollerImage: false });
  interactionsCleanupUserId = user.id;

  // Seed a renderable, stack-rank-eligible card (which carries a listing_id),
  // then reset this user's interactions so the queue starts fully populated.
  await ensureSeededScrollerImages();
  await deleteCustomerImageInteractions(user.id);
  await page.reload();

  await expect(page.getByTestId('scroller-image')).toBeVisible({ timeout: 30000 });

  const viewListing = page.getByTestId('view-listing-button');
  await expect(viewListing).toBeVisible();

  // The href targets the detail route for this card's listing id; capture it and
  // assert navigation lands there (rather than hard-coding the seeded id).
  const href = await viewListing.getAttribute('href');
  expect(href).toMatch(/\/listing\/\d+$/);

  await viewListing.click();
  await expect(page).toHaveURL(new RegExp(`${href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[/?#].*)?$`));
});

test('view-listing control does not disturb Skip/Like recording', async ({ page }) => {
  test.setTimeout(60000);

  const user = await loginAndExpectAuthenticated(page, { expectScrollerImage: false });
  interactionsCleanupUserId = user.id;

  await ensureSeededScrollerImages();
  await deleteCustomerImageInteractions(user.id);
  await page.reload();

  const scrollerImage = page.getByTestId('scroller-image');
  await expect(scrollerImage).toBeVisible({ timeout: 30000 });

  // The View-listing control is present on the card...
  await expect(page.getByTestId('view-listing-button')).toBeVisible();

  const existingInteractions = await getCustomerImageInteractions(user.id);
  const knownIds = new Set(existingInteractions.map((interaction) => interaction.id));

  // ...and the existing Like button still records an interaction and advances.
  await page.getByRole('button', { name: 'Like' }).click();
  const likeInteraction = await waitForNewInteraction({
    customerId: user.id,
    expectedAction: 1,
    knownIds,
  });
  knownIds.add(likeInteraction.id);
  expect(likeInteraction.action).toBe(1);

  await expect(scrollerImage).toBeVisible({ timeout: 30000 });

  // ...as does Skip on the next card.
  await page.getByRole('button', { name: 'Skip' }).click();
  const skipInteraction = await waitForNewInteraction({
    customerId: user.id,
    expectedAction: 0,
    knownIds,
  });
  expect(skipInteraction.action).toBe(0);
  expect(skipInteraction.image_id).not.toBe(likeInteraction.image_id);
});
