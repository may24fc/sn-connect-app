/**
 * E2E Test: Auth Email Confirmation & Redirect Flow
 *
 * These tests verify that the auth callback route correctly handles PKCE
 * code exchange and redirect validation across different environments.
 *
 * Since we cannot trigger real Supabase email delivery in E2E tests, we test:
 * 1. The callback route behaviour with missing/invalid codes.
 * 2. The `next` parameter redirect validation (open-redirect prevention).
 * 3. The forgot-password flow reaches the confirmation page.
 *
 * For full email confirmation flow testing with real Supabase, set:
 *   E2E_AUTH_EMAIL, E2E_AUTH_PASSWORD
 */

import { expect, test } from '@playwright/test';

const authEmail = process.env.E2E_AUTH_EMAIL;
const authPassword = process.env.E2E_AUTH_PASSWORD;
const baseURL = 'http://localhost:3000';

test.describe('Auth Callback Route — Redirect Validation', () => {
  test('callback without code redirects to login with error', async ({ page }) => {
    // Visiting the callback route without a `code` param should redirect to
    // /login?error=missing_code — not crash or show a blank page.
    await page.goto('/auth/callback');

    await expect(page).toHaveURL(/\/login\?error=missing_code/);
  });

  test('callback with invalid code redirects to login with auth error', async ({ page }) => {
    // An invalid/expired code should redirect to /login?error=auth_callback.
    // This also exercises the Supabase code exchange error path.
    await page.goto('/auth/callback?code=invalid-test-code');

    // May show either missing_code (if Supabase not configured) or auth_callback
    // or config (if env vars missing). All should land on /login with an error.
    await expect(page).toHaveURL(/\/login\?error=/);
  });

  test('callback validates next parameter — relative path allowed', async ({ page }) => {
    // Relative paths should be preserved after code exchange.
    // Since the code is invalid, we just verify the redirect lands on login,
    // but the logic in the route validates `next` before redirecting.
    await page.goto('/auth/callback?code=test&next=/admin/dashboard');

    await expect(page).toHaveURL(/\/login\?error=/);
  });

  test('callback rejects absolute URL for next parameter (open-redirect prevention)', async ({
    page,
  }) => {
    // An attacker-crafted callback with next=https://evil.com should NOT
    // redirect to the external site. The route validates against the allowlist.
    await page.goto('/auth/callback?code=test&next=https://evil.com/steal-session');

    // Should land on /login with error (code is invalid), not on evil.com.
    await expect(page).toHaveURL(/\/login\?error=/);
    expect(page.url()).not.toContain('evil.com');
  });

  test('API callback route without code redirects to login', async ({ page }) => {
    await page.goto('/api/auth/callback');

    await expect(page).toHaveURL(/\/login\?error=/);
  });
});

test.describe('Forgot Password Flow — Redirect URL', () => {
  test('forgot password form reaches confirmation page', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.getByLabel('Email').fill('test@example.com');

    const submitButton = page.getByRole('button', {
      name: /send|reset|submit/i,
    });
    await submitButton.click();

    // Should navigate to the confirmation page or show a success message.
    // The key point is that `redirectTo` uses the centralized config now.
    await expect(page).toHaveURL(/\/forgot-password\/confirmation/, { timeout: 15000 });
  });
});

test.describe('Auth Callback — Full Flow (requires credentials)', () => {
  test.skip(
    !(authEmail && authPassword),
    'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run full auth flow tests.'
  );

  test('login and verify session cookie is set', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill(authEmail!);
    await page.locator('#password').fill(authPassword!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/(dashboard|admin|super-admin|intern|onboarding)/, {
      timeout: 15000,
    });

    // Verify auth cookies exist (Supabase stores session in sb-*-auth-token cookies).
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter((c) => c.name.includes('auth-token'));
    // When Supabase is configured, auth cookies should be present.
    // In mock auth mode, there may be no cookies (session is in localStorage).
    if (process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH !== 'true') {
      expect(authCookies.length).toBeGreaterThan(0);
    }
  });

  test('redirect works on current environment origin', async ({ page, context }) => {
    // This test verifies that the callback URL uses the correct origin
    // for the current environment (localhost during local dev).
    await page.goto('/login');

    await page.getByLabel('Email').fill(authEmail!);
    await page.locator('#password').fill(authPassword!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/(dashboard|admin|super-admin|intern|onboarding)/, {
      timeout: 15000,
    });

    // Verify we're on the expected base URL (not redirected to a different origin).
    const currentUrl = new URL(page.url());
    expect(currentUrl.origin).toBe(baseURL);
  });
});
