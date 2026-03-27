import { defineConfig, devices } from '@playwright/test';

const LOCAL_BASE_URL = 'http://localhost:8410';
const isDeploySmoke = process.env.PLAYWRIGHT_DEPLOY_SMOKE === '1';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? LOCAL_BASE_URL;

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  testMatch: isDeploySmoke ? ['**/*.smoke.spec.ts'] : undefined,
  testIgnore: isDeploySmoke ? undefined : ['**/*.smoke.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['line'],
    ['html', { open: 'never' }],
    ['allure-playwright', { resultsDir: 'allure-results-e2e' }],
  ],
  webServer: isDeploySmoke
    ? undefined
    : {
        command: 'npm run dev',
        url: LOCAL_BASE_URL,
        reuseExistingServer: !process.env.CI,
      },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: isDeploySmoke
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
      ],
});
