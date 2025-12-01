/** Minimal Playwright config used by CI/local runs in this repo */
import { devices } from '@playwright/test';

export default {
  testDir: 'tests/playwright',
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  use: {
    headless: true,
    actionTimeout: 0,
    baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:3003',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ]
};
