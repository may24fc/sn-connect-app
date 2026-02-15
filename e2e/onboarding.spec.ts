import { expect, test } from '@playwright/test';

test.describe('Onboarding Setup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('redirect on first login to onboarding setup (manual navigation in mock mode)', async ({
    page,
  }) => {
    await page.fill('[name="email"]', 'employee@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/onboarding/setup');
    await expect(page).toHaveURL('/onboarding/setup');
    await expect(page.getByText(/Complete Your Onboarding Setup/i)).toBeVisible();
  });

  test('complete full wizard step progression', async ({ page }) => {
    await page.fill('[name="email"]', 'employee@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/onboarding/setup');

    await page.fill('#firstName', 'John');
    await page.fill('#lastName', 'Doe');
    await page.fill('#position', 'Engineer');
    await page.click('button:has-text("Save & Continue")');

    await expect(page.getByText(/2\. Payment Info/i)).toBeVisible();

    await page.fill('#paymentAccountName', 'John Doe');
    await page.fill('#paymentAccountNumber', '12345678');
    await page.click('button:has-text("Save & Continue")');

    await expect(page.getByText(/3\. Documents/i)).toBeVisible();

    await page.click('button:has-text("Save & Continue")');
    await expect(page.getByText(/4\. Review/i)).toBeVisible();
  });

  test('save draft and resume after reload', async ({ page }) => {
    await page.fill('[name="email"]', 'employee@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/onboarding/setup');
    await page.fill('#firstName', 'Resume');
    await page.fill('#lastName', 'Test');
    await page.fill('#position', 'QA');
    await page.reload();

    await expect(page.locator('#firstName')).toHaveValue('Resume');
  });

  test('shows validation error on required fields', async ({ page }) => {
    await page.fill('[name="email"]', 'employee@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/onboarding/setup');
    await page.click('button:has-text("Save & Continue")');

    await expect(
      page.getByText(/First name, last name, and position are required\./i)
    ).toBeVisible();
  });

  test('completion page is accessible', async ({ page }) => {
    await page.fill('[name="email"]', 'employee@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/onboarding/complete');
    await expect(page.getByText(/Onboarding Completed/i)).toBeVisible();
  });
});
