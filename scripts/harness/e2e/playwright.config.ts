import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Multi-Portal Configuration (G-282)
 * Orchestrates all 5 sovereign frontend portals against backend APIs.
 */
export default defineConfig({
  testDir: './',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    baseURL: 'http://localhost:8080',
  },
  projects: [
    {
      name: 'Brand Portal (:4000)',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4000',
      },
    },
    {
      name: 'Agency Portal (:4001)',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4001',
      },
    },
    {
      name: 'Creator LIFF (:4003)',
      use: {
        ...devices['iPhone 14 Pro'],
        baseURL: 'http://localhost:4003',
      },
    },
    {
      name: 'Internal CRM (:4004)',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4004',
      },
    },
    {
      name: 'System Admin (:4005)',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4005',
      },
    },
  ],
});
