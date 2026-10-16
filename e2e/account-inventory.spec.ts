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
        leadershipAccounts: [
          {
            id: 'cef-admin',
            email: 'cef.admin@example.com',
            role: 'super_admin',
            status: 'active',
            account_kind: 'workforce',
            account_purpose: null,
          },
          {
            id: 'may-admin',
            email: 'may@24fitclub.com.au',
            role: 'super_admin',
            status: 'active',
            account_kind: 'workforce',
            account_purpose: null,
          },
          {
            id: 'steven-admin',
            email: 'steven@24fitclub.com.au',
            role: 'super_admin',
            status: 'active',
            account_kind: 'workforce',
            account_purpose: null,
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

test('super admin classifies one leadership account without changing the others', async ({
  page,
}, testInfo: TestInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/super-admin/account-inventory');

  await page.getByLabel('Leadership account').selectOption('cef-admin');
  await page.getByLabel('Population').selectOption('privileged');
  await page
    .getByLabel('Account purpose')
    .fill('Production configuration and permission verification');

  const requestPromise = page.waitForRequest(
    (request) =>
      request.url().endsWith('/api/account-inventory') && request.method() === 'PATCH'
  );
  await page.getByRole('button', { name: 'Save classification' }).click();
  const request = await requestPromise;
  expect(request.postDataJSON()).toEqual({
    userId: 'cef-admin',
    accountKind: 'privileged',
    purpose: 'Production configuration and permission verification',
  });
  await expect(page.getByText(/Account classification updated/)).toBeVisible();
  await expect(page.getByRole('option', { name: /may@24fitclub.com.au/ })).toBeAttached();
  await expect(page.getByRole('option', { name: /steven@24fitclub.com.au/ })).toBeAttached();
  await page.screenshot({
    path: testInfo.outputPath('leadership-classification-desktop.png'),
    fullPage: true,
  });
});

test('super admin reaches Account Inventory from the profile menu, not the sidebar', async ({
  page,
}, testInfo: TestInfo) => {
  const problems: Array<string> = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    // The mock-auth harness has no real session, so unmocked shell APIs answer 401.
    if (message.type() === 'error' && !/status of 401/.test(message.text())) {
      problems.push(`console: ${message.text()}`);
    }
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/super-admin/settings');
  await expect(page.getByRole('button', { name: 'Open profile menu' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Account Inventory' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Account Inventory' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Account Inventory' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('profile-menu-desktop.png') });
  await page.getByRole('menuitem', { name: 'Account Inventory' }).click();
  await expect(page).toHaveURL(/\/super-admin\/account-inventory$/);
  await expect(page.getByRole('heading', { name: 'Account Inventory' })).toBeVisible();
  expect(problems).toEqual([]);
});

test('profile menu entry is usable at a mobile viewport', async ({ page }, testInfo: TestInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/super-admin/settings');
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  const item = page.getByRole('menuitem', { name: 'Account Inventory' });
  await expect(item).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('profile-menu-mobile.png') });
  await item.click();
  await expect(page).toHaveURL(/\/super-admin\/account-inventory$/);
});

test('admins who are not super admins do not see Account Inventory in the profile menu', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'admin-1',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
        accountKind: 'workforce',
        isOnboardingComplete: true,
      })
    );
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/admin/settings');
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Account Inventory' })).toHaveCount(0);
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
