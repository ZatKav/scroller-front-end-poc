import { expect, type Page, type Response } from '@playwright/test';

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

function isDeploySmoke(): boolean {
  return process.env.PLAYWRIGHT_DEPLOY_SMOKE === '1';
}

function authCookiePath(): string {
  return basePath() || '/';
}

function extractAuthToken(setCookieHeader: string | undefined): string | null {
  if (!setCookieHeader) {
    return null;
  }

  const match = setCookieHeader.match(/(?:^|;\s*)auth-token=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function bridgeDeploySmokeAuthCookie(
  page: Page,
  loginResponse: Response
): Promise<void> {
  if (!isDeploySmoke()) {
    return;
  }

  const existingAuthCookie = (await page.context().cookies())
    .find((cookie) => cookie.name === 'auth-token');
  if (existingAuthCookie) {
    return;
  }

  const authToken = extractAuthToken(
    await loginResponse.headerValue('set-cookie') ?? loginResponse.headers()['set-cookie']
  );
  expect(authToken).toBeTruthy();

  const currentUrl = new URL(page.url());
  await page.context().addCookies([
    {
      name: 'auth-token',
      value: authToken as string,
      domain: currentUrl.hostname,
      path: authCookiePath(),
      httpOnly: true,
      secure: false,
      sameSite: 'Strict',
      expires: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    },
  ]);
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
  await bridgeDeploySmokeAuthCookie(page, loginResponse);

  // Landing must be the protected scroller entry page, not just "off the login
  // page": wait for the deployed entry path and confirm the protected heading.
  await page.waitForURL((url) => url.pathname === appPath('/'));
  expect(new URL(page.url()).pathname).toBe(appPath('/'));
  if (isDeploySmoke()) {
    await page.goto(appPath('/'));
  }
  // The protected page is client-rendered, and in CI the browser reaches the
  // deployed app over host.containers.internal, whose latency has been
  // intermittent. The default 5s assertion timeout can lapse before the client
  // bundle finishes loading and renders the heading, so give it room. (The
  // landing is a soft navigation, so this does not re-trigger the auth check.)
  await expect(page.getByRole('heading', { name: 'Scroller' })).toBeVisible({
    timeout: 30_000,
  });

  return user as AuthenticatedE2EUser;
}
