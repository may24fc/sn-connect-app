import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
const AUTH_FILE = path.join(process.cwd(), 'playwright-auth.json');
const LOGIN_URL = `${BASE_URL}/login`;
const AUTHENTICATED_URL_PATTERN = /\/(dashboard|admin\/dashboard|super-admin\/dashboard|associate\/dashboard|onboarding)/;

const TEST_CREDENTIALS = {
  email: process.env.E2E_AUTH_EMAIL ?? 'admin@test.com',
  password: process.env.E2E_AUTH_PASSWORD ?? 'password',
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
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Check if already logged in
    const emailInput = page.getByLabel('Email Address');
    if (!(await emailInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('[Playwright Auth] Already logged in, saving context...');
      await saveAuthState(context);
      return;
    }

    // Fill login form
    console.log('[Playwright Auth] Filling login form...');
    await emailInput.fill(TEST_CREDENTIALS.email);
    await page.locator('#password').fill(TEST_CREDENTIALS.password);

    // Click login button
    console.log('[Playwright Auth] Clicking login button...');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for navigation to dashboard
    console.log('[Playwright Auth] Waiting for dashboard navigation...');
    try {
      await page.waitForURL(AUTHENTICATED_URL_PATTERN, { timeout: 30000 });
    } catch (error) {
      const mockAuthUser = await page.evaluate(() => localStorage.getItem('auth_user'));
      if (!mockAuthUser) {
        throw error;
      }

      console.log('[Playwright Auth] Mock auth state detected, forcing dashboard navigation...');
      await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForURL(AUTHENTICATED_URL_PATTERN, { timeout: 30000 });
    }

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
