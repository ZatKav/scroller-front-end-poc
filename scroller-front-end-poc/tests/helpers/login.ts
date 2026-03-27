import { expect, type Page } from '@playwright/test';

export function getLoginCredentials(): { username: string; password: string } {
  return {
    username: process.env.E2E_LOGIN_USERNAME ?? 'jack',
    password: process.env.E2E_LOGIN_PASSWORD ?? 'password123',
  };
}

export async function loginAndExpectAuthenticated(page: Page): Promise<void> {
  const { username, password } = getLoginCredentials();

  await page.goto('/login');
  await expect(page).toHaveURL(/\/login(?:[/?#].*)?$/);

  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);

  const loginResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/auth/login' && response.request().method() === 'POST';
  });

  await page.getByRole('button', { name: /sign in/i }).click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();

  await page.waitForURL((url) => url.pathname !== '/login');
  expect(new URL(page.url()).pathname).not.toBe('/login');
}
