import { type TestInfo, expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'super-admin-1',
        name: 'Super Admin',
        email: 'super-admin@example.com',
        role: 'super_admin',
        accountKind: 'workforce',
        isOnboardingComplete: true,
      })
    );
  });

  await page.route('**/api/account-inventory', (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 'test-1',
            email: 'benchmark@example.com',
            role: 'admin',
            status: 'active',
            account_kind: 'test',
            account_purpose: 'Automated performance measurement',
            access_expires_at: null,
            created_at: '2026-10-01T00:00:00Z',
          },
          {
            id: 'reviewer-1',
            email: 'applicant@example.com',
            role: 'reviewer',
            status: 'active',
            account_kind: 'reviewer',
            account_purpose: 'Evaluate onboarding usability',
            access_expires_at: '2026-10-22T00:00:00Z',
            created_at: '2026-10-15T00:00:00Z',
          },
        ],
      },
    })
  );
  await page.route('**/api/review/invitations', (route) =>
    route.fulfill({
      status: 201,
      json: { data: { engagementId: 'engagement-1', expiresAt: '2026-10-22T00:00:00Z' } },
    })
  );
});

test('super admin reviews non-workforce accounts and creates a server-confirmed invitation', async ({
  page,
}, testInfo: TestInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/super-admin/account-inventory');
  await expect(page.getByRole('heading', { name: 'Account Inventory' })).toBeVisible();
  await expect(page.getByText('benchmark@example.com')).toBeVisible();
  await expect(page.getByText('applicant@example.com')).toBeVisible();

  await page.getByLabel('Name').fill('New Product Reviewer');
  await page.getByLabel('Designated email').fill('new-reviewer@example.com');
  await page.getByLabel('Review purpose').fill('Evaluate the navigation and feedback workflow.');
  await page.getByRole('button', { name: 'Send seven-day invitation' }).click();
  await expect(page.getByText(/Review invitation created/)).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('account-inventory-desktop.png'),
    fullPage: true,
  });
});

test('account inventory remains usable at a mobile viewport', async ({
  page,
}, testInfo: TestInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/super-admin/account-inventory');
  await expect(page.getByRole('heading', { name: 'Account Inventory' })).toBeVisible();
  await expect(page.getByText('benchmark@example.com')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('account-inventory-mobile.png'),
    fullPage: true,
  });
});
