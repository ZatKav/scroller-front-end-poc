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

function listingsPath(): string {
  return appPath('/listings');
}

export function scrollerEntryPath(): string {
  return appPath('/');
}

function isDeploySmoke(): boolean {
  return process.env.PLAYWRIGHT_DEPLOY_SMOKE === '1';
}

function shouldBridgeDeploySmokeAuthCookie(): boolean {
  if (!isDeploySmoke()) {
    return false;
  }

  try {
    const baseUrl = new URL(process.env.PLAYWRIGHT_BASE_URL ?? '');
    return baseUrl.protocol === 'http:';
  } catch {
    return false;
  }
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
  if (!shouldBridgeDeploySmokeAuthCookie()) {
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

/**
 * Feed-agnostic assertion that the authenticated scroller has rendered. The
 * shared deploy target may have an empty feed (e.g. the enrichment-db image
 * source was redeployed/wiped), so accept either the scroller image or the
 * valid "No more images" empty state — both prove the protected page rendered.
 * Use this for deploy smokes, where seeded image data is not guaranteed; use a
 * strict `scroller-image` assertion only where the feed is reset/seeded first.
 */
async function assertScrollerContentVisible(page: Page): Promise<void> {
  const scrollerImage = page.getByTestId('scroller-image');
  const emptyState = page.getByText('No more images');
  await expect(scrollerImage.or(emptyState).first()).toBeVisible({
    timeout: 30_000,
  });
}

async function assertListingsContentVisible(page: Page): Promise<void> {
  const listingHeading = page.locator('h1').first();
  const emptyState = page.getByText('No more listings');
  await expect(listingHeading.or(emptyState).first()).toBeVisible({
    timeout: 30_000,
  });
}

/**
 * Asserts the current page is the rendered, authenticated scroller entry page:
 * scroller content is visible (image or empty state) and the visitor was not
 * bounced to login. Feed-agnostic — see `assertScrollerContentVisible`.
 */
export async function expectScrollerPageRendered(page: Page): Promise<void> {
  await assertScrollerContentVisible(page);
  const pathname = new URL(page.url()).pathname;
  expect(pathname).toBe(appPath('/'));
  expect(pathname).not.toBe(appPath('/login'));
}

export async function expectListingsPageRendered(page: Page): Promise<void> {
  await assertListingsContentVisible(page);
  const pathname = new URL(page.url()).pathname;
  expect(
    pathname === listingsPath() || pathname.startsWith(`${listingsPath()}/`),
  ).toBeTruthy();
  expect(pathname).not.toBe(appPath('/login'));
}

/**
 * Given an already-authenticated session, navigates directly to the public entry
 * path (e.g. `/scroller`) and asserts the protected scroller page renders rather
 * than bouncing to login, then confirms a refresh keeps the visitor on it.
 *
 * Feed-agnostic: the entry page only needs to render the authenticated scroller
 * (image or empty state), not a specific image, so it survives an empty shared
 * feed. The redirect guard below is the real subject under test.
 *
 * Guards PRO-232: the shared nginx used to unconditionally 302 the exact
 * `/scroller` entry path to `/scroller/login`, so authenticated direct navigation
 * (notably from mobile, and on refresh after login) was always sent back to login
 * despite a valid session.
 */
export async function expectAuthenticatedEntryRendersScroller(page: Page): Promise<void> {
  const base = basePath();
  const entryPath = base || '/';

  await page.goto(entryPath);
  await assertScrollerContentVisible(page);
  const afterEntry = new URL(page.url()).pathname;
  expect(afterEntry).toBe(appPath('/'));
  expect(afterEntry).not.toBe(appPath('/login'));

  // A refresh / direct re-entry must keep the authenticated visitor on the
  // protected page (acceptance criterion for mobile login survivability).
  await page.reload();
  await assertScrollerContentVisible(page);
  expect(new URL(page.url()).pathname).toBe(appPath('/'));
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

export interface LoginExpectationOptions {
  // Whether to assert the post-login listings flow renders. Tests that drive the
  // legacy image scroller should pass false, navigate to `scrollerEntryPath()`,
  // then assert the image themselves after resetting interactions.
  expectListingsContent?: boolean;
}

export async function loginAndExpectAuthenticated(
  page: Page,
  options: LoginExpectationOptions = {},
): Promise<AuthenticatedE2EUser> {
  const { expectListingsContent = true } = options;
  const { username, password } = getLoginCredentials();

  // First-time sign-ins are routed through /onboarding until they build a feed
  // (the "completed" flag lives in localStorage via PreferencesContext). These
  // smokes exercise the authenticated listings/scroller flow, not onboarding, so
  // pre-seed the completed flag to keep post-login routing pointed at /listings.
  // Onboarding is covered separately.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        'zelli.preferences.v1',
        JSON.stringify({ filters: {}, onboardingComplete: true }),
      );
    } catch {
      // Storage may be unavailable; a routing regression will still surface below.
    }
  });

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

  // Landing must be the protected listings flow, not just "off the login page".
  await page.waitForURL((url) => (
    url.pathname === listingsPath() || url.pathname.startsWith(`${listingsPath()}/`)
  ));
  const landingPathname = new URL(page.url()).pathname;
  expect(
    landingPathname === listingsPath() || landingPathname.startsWith(`${listingsPath()}/`),
  ).toBeTruthy();
  if (expectListingsContent) {
    await assertListingsContentVisible(page);
  }

  return user as AuthenticatedE2EUser;
}
