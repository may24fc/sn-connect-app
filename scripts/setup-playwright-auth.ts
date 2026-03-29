import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
const AUTH_FILE = path.join(process.cwd(), 'playwright-auth.json');

// Test credentials from CLAUDE.md
const TEST_CREDENTIALS = {
  email: 'admin@test.com',
  password: 'password',
};

async function setupAuth() {
  console.log(`[Playwright Auth] Starting auth setup for ${TEST_CREDENTIALS.email}...`);
  console.log(`[Playwright Auth] Base URL: ${BASE_URL}`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    console.log('[Playwright Auth] Navigating to login page...');
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle', timeout: 30000 });

    // Check if already logged in
    const emailInput = page.locator('input[type="email"]');
    if (!(await emailInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('[Playwright Auth] Already logged in, saving context...');
      await saveAuthState(context);
      return;
    }

    // Fill login form
    console.log('[Playwright Auth] Filling login form...');
    await emailInput.fill(TEST_CREDENTIALS.email);
    await page.locator('input[type="password"]').fill(TEST_CREDENTIALS.password);

    // Click login button
    console.log('[Playwright Auth] Clicking login button...');
    await page.click('button:has-text("Sign in")');

    // Wait for navigation to dashboard
    console.log('[Playwright Auth] Waiting for dashboard navigation...');
    await page.waitForURL(`${BASE_URL}/dashboard**`, { timeout: 30000 });

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    console.log('[Playwright Auth] Login successful, saving context...');
    await saveAuthState(context);
  } catch (error) {
    console.error('[Playwright Auth] Setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function saveAuthState(context: any) {
  const cookies = await context.cookies();
  const storageState = await context.storageState();

  const authState = {
    cookies: cookies,
    origins: storageState.origins || [],
  };

  fs.writeFileSync(AUTH_FILE, JSON.stringify(authState, null, 2));
  console.log(`[Playwright Auth] Auth state saved to: ${AUTH_FILE}`);
}

// Run if executed directly
if (require.main === module) {
  setupAuth().catch((error) => {
    console.error('[Playwright Auth] Fatal error:', error);
    process.exit(1);
  });
}
