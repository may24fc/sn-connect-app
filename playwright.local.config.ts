import { defineConfig, devices } from '@playwright/test';

const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? '3002');
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${webPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node scripts/start-playwright-web.js',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
