import { expect, test } from '@playwright/test';

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

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/directory') {
      await route.fulfill({
        json: {
          data: [],
          metadata: {
            total: 0,
            active: 0,
            interns: 0,
            onLeave: 0,
            probation: 0,
            terminated: 0,
            availableRoles: ['employee', 'associate'],
          },
          pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        },
      });
      return;
    }
    if (url.pathname === '/api/departments' || url.pathname === '/api/divisions') {
      await route.fulfill({
        json: { data: [], pagination: { page: 1, pageSize: 200, total: 0, totalPages: 0 } },
      });
      return;
    }
    if (url.pathname === '/api/notifications') {
      await route.fulfill({
        json: {
          data: [],
          unreadCount: 0,
          pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0 },
        },
      });
      return;
    }
    await route.fulfill({ json: { data: [] } });
  });
});

test('leadership invite explicitly separates workforce and privileged identities', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/admin/directory', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Invite Leadership' }).click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Account population')).toBeVisible();
  await expect(page.getByLabel('Account population')).toContainText('Workforce leader');
  await page.getByLabel('Account population').click();
  await page.getByRole('option', { name: 'Privileged non-workforce account' }).click();
  await expect(page.getByLabel('Account purpose')).toBeVisible();
  await expect(page.getByText(/excludes the identity from Directory, OKRs\/KPIs/)).toBeVisible();
  await page.getByLabel('Account purpose').fill('Production configuration verification');
  await page.screenshot({
    path: testInfo.outputPath('leadership-invite-classification-desktop.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Account purpose')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('leadership-invite-classification-mobile.png'),
    fullPage: true,
  });
});
