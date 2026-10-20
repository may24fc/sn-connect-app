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
      const isLeadPicker = url.searchParams.get('page_size') === '500';
      await route.fulfill({
        json: {
          data: isLeadPicker
            ? [
                {
                  user_id: 'employee-1',
                  full_name: 'Alex Operations',
                  role: 'employee',
                  status: 'active',
                  department_id: 'operations',
                  department_name: 'Operations',
                  position: 'Operations Associate',
                  avatar_url: null,
                },
              ]
            : [],
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
    if (url.pathname === '/api/departments/leads') {
      await route.fulfill({ json: { data: [] } });
      return;
    }
    if (url.pathname === '/api/departments') {
      await route.fulfill({
        json: {
          data: [{ id: 'operations', name: 'Operations' }],
          pagination: { page: 1, pageSize: 200, total: 1, totalPages: 1 },
        },
      });
      return;
    }
    if (url.pathname === '/api/divisions') {
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

test('super-admin can open department lead management at desktop and mobile sizes', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/admin/directory', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Manage departments' }).click();

  const dialog = page.getByRole('dialog', { name: 'Manage department leads' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Multiple co-leads are supported/)).toBeVisible();
  await dialog.getByRole('combobox', { name: 'Department', exact: true }).click();
  await page.getByRole('option', { name: 'Operations' }).click();
  await dialog.getByLabel('New department lead').click();
  await expect(page.getByRole('option', { name: 'Alex Operations' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: testInfo.outputPath('department-leads-desktop.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await dialog.evaluate((element) => ({
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
  }));
  expect(bounds.left).toBeGreaterThanOrEqual(14);
  expect(bounds.right).toBeLessThanOrEqual(376);
  await page.screenshot({ path: testInfo.outputPath('department-leads-mobile.png') });
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
