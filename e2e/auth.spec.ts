import { expect, test } from '@playwright/test';

const authEmail = process.env.E2E_AUTH_EMAIL;
const authPassword = process.env.E2E_AUTH_PASSWORD;

test.describe('Authentication', () => {
  test.skip(
    !(authEmail && authPassword),
    'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run auth tests.'
  );

  test('login success', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(authEmail!);
    await page.locator('#password').fill(authPassword!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/(dashboard|admin|super-admin|intern|onboarding)/);
  });

  test('login failure shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('invalid@example.com');
    await page.locator('#password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText(/invalid/i)).toBeVisible();
  });

  test('protected route redirects to login', async ({ page }) => {
    await page.goto('/admin/dashboard');

    await expect(page).toHaveURL(/\/login/);
  });

  test('logout clears session', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(authEmail!);
    await page.locator('#password').fill(authPassword!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/(dashboard|admin|super-admin|intern|onboarding)/);

    const userMenuTrigger = page
      .locator('header')
      .getByRole('button')
      .filter({ hasText: /employee|intern|admin|super_admin|super admin/i })
      .last();
    await userMenuTrigger.click();
    await page.getByRole('menuitem', { name: 'Log out' }).click();

    try {
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    } catch {
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('session persists on reload', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(authEmail!);
    await page.locator('#password').fill(authPassword!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/(dashboard|admin|super-admin|intern|onboarding)/);

    await page.reload();
    await expect(page).toHaveURL(/\/(dashboard|admin|super-admin|intern|onboarding)/);
  });
});
