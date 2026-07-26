import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8411/scroller';

test('listing feed renders images from /media and they actually load', async ({ page }) => {
  const imageRequests: { url: string; status: number; bytes: number }[] = [];

  page.on('response', async (response) => {
    if (response.url().includes('/media/v1/')) {
      let bytes = 0;
      try {
        bytes = (await response.body()).length;
      } catch {
        /* body may be unavailable for cached responses */
      }
      imageRequests.push({ url: response.url(), status: response.status(), bytes });
    }
  });

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"], #username', 'jack');
  await page.fill('input[name="password"], #password', 'jackNgrok2026!');
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/scroller\/(listings|onboarding)/, { timeout: 20000 });
  if (page.url().includes('onboarding')) {
    await page.goto(`${BASE}/listings`);
  }

  const img = page.getByTestId('carousel-image');
  await expect(img).toBeVisible({ timeout: 20000 });

  const src = await img.getAttribute('src');
  const srcset = await img.getAttribute('srcset');
  console.log('IMG_SRC=' + src);
  console.log('IMG_SRCSET=' + srcset);

  expect(src).toMatch(/\/media\/v1\/[0-9a-f]{64}\/(thumb|card|full)\.webp/);
  expect(srcset).toContain('400w');
  expect(srcset).toContain('1280w');

  // The image must have real pixels, i.e. it decoded rather than 404ing.
  const dims = await img.evaluate((node) => {
    const el = node as HTMLImageElement;
    return { natural: el.naturalWidth, complete: el.complete };
  });
  console.log('NATURAL_WIDTH=' + dims.natural + ' COMPLETE=' + dims.complete);
  expect(dims.complete).toBe(true);
  expect(dims.natural).toBeGreaterThan(0);

  await page.waitForTimeout(1500);
  console.log('MEDIA_REQUESTS=' + JSON.stringify(imageRequests, null, 1));
  expect(imageRequests.length).toBeGreaterThan(0);
  expect(imageRequests.every((r) => r.status === 200 || r.status === 304)).toBe(true);
});
