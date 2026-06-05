import { defineConfig, devices } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:8000';
const WEB_BASE = process.env.WEB_BASE_URL ?? 'http://127.0.0.1:3000';
const TABLE_BASE = process.env.TABLE_BASE_URL ?? 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testMatch: /api-.*\.spec\.ts/,
      use: {
        baseURL: API_BASE,
      },
    },
    {
      name: 'ui-web',
      testMatch: /ui-web-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: WEB_BASE,
      },
    },
    {
      name: 'ui-table',
      testMatch: /ui-table-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: TABLE_BASE,
      },
    },
  ],
});
