import { expect, type Page } from '@playwright/test';

export interface AuthenticatedE2EUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

export function getLoginCredentials(): { username: string; password: string } {
  return {
    username: process.env.E2E_LOGIN_USERNAME ?? 'jack',
    password: process.env.E2E_LOGIN_PASSWORD ?? 'jackNgrok2026!',
  };
}

function isAuthenticatedE2EUser(user: unknown): user is AuthenticatedE2EUser {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const candidate = user as Partial<AuthenticatedE2EUser>;
  return (
    typeof candidate.id === 'number'
    && typeof candidate.username === 'string'
    && typeof candidate.email === 'string'
    && typeof candidate.role === 'string'
  );
}

export async function loginAndExpectAuthenticated(page: Page): Promise<AuthenticatedE2EUser> {
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
  const loginResponseBody: unknown = await loginResponse.json();
  const user = (loginResponseBody as { user?: unknown }).user;
  expect(isAuthenticatedE2EUser(user)).toBeTruthy();

  await page.waitForURL((url) => url.pathname !== '/login');
  expect(new URL(page.url()).pathname).not.toBe('/login');

  return user as AuthenticatedE2EUser;
}
