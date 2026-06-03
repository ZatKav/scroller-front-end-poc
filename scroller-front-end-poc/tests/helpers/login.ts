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

function basePath(): string {
  return (process.env.PLAYWRIGHT_APP_BASE_PATH ?? '').replace(/\/+$/, '');
}

function appPath(path: string): string {
  const base = basePath();
  if (!base) {
    return path;
  }
  if (path === '/') {
    return base;
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Opens the deployed entry path (e.g. `/scroller`) as an unauthenticated visitor
 * and asserts it redirects to exactly `<base>/login`, never a duplicated
 * `<base>/<base>/login`, and that the login page renders rather than a 404.
 *
 * This guards the PRO-225 regression where the protected layout double-applied
 * the base path on its server redirect.
 */
export async function expectEntryRedirectsToLogin(page: Page): Promise<void> {
  const base = basePath();
  const entryPath = base || '/';

  await page.goto(entryPath);
  await page.waitForURL((url) => url.pathname === appPath('/login'));

  const pathname = new URL(page.url()).pathname;
  expect(pathname).toBe(appPath('/login'));
  if (base) {
    expect(pathname.startsWith(`${base}${base}`)).toBeFalsy();
  }

  // The login form must be displayed instead of a 404 page.
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
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

  await page.goto(appPath('/login'));
  await expect(page).toHaveURL(/\/login(?:[/?#].*)?$/);

  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);

  const loginResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === appPath('/api/auth/login') && response.request().method() === 'POST';
  });

  await page.getByRole('button', { name: /sign in/i }).click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
  const loginResponseBody: unknown = await loginResponse.json();
  const user = (loginResponseBody as { user?: unknown }).user;
  expect(isAuthenticatedE2EUser(user)).toBeTruthy();

  // Landing must be the protected scroller entry page, not just "off the login
  // page": wait for the deployed entry path and confirm the protected heading.
  await page.waitForURL((url) => url.pathname === appPath('/'));
  expect(new URL(page.url()).pathname).toBe(appPath('/'));
  await expect(page.getByRole('heading', { name: 'Scroller' })).toBeVisible();

  return user as AuthenticatedE2EUser;
}
