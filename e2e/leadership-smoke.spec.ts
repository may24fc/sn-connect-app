import { expect, test } from '@playwright/test';

const authEmail = process.env.E2E_AUTH_EMAIL;
const authPassword = process.env.E2E_AUTH_PASSWORD;

test.describe('Leadership Smoke', () => {
  test.skip(
    !(authEmail && authPassword),
    'Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run leadership smoke tests.'
  );

  test('super admin login lands on dashboard and avoids onboarding', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(authEmail!);
    await page.locator('#password').fill(authPassword!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/super-admin\/dashboard/);
    await expect(page).not.toHaveURL(/\/onboarding(?:\/|$)/);
    await expect(
      page.getByText('Complete system overview and control.', { exact: true })
    ).toBeVisible();
  });

  test('super admin can reach resources', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(authEmail!);
    await page.locator('#password').fill(authPassword!);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/super-admin\/dashboard/);

    await page.goto('/super-admin/resources');
    await expect(page).toHaveURL(/\/(?:admin|super-admin)\/resources/, { timeout: 20000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Resources' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Failed to load resources.')).toHaveCount(0);
  });

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();
    await expect(
      page.getByText('No worries, we will send you reset instructions.', { exact: true })
    ).toBeVisible();
  });
});