import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  const appointments: Array<{
    id: string;
    department_id: string;
    user_id: string;
    name: string;
    appointed_at: string;
    avatarUrl: null;
    position: string;
  }> = [];
  const person = {
    user_id: 'marketing-lead',
    full_name: 'Alex Marketing',
    role: 'admin',
    status: 'active',
    department_id: 'marketing',
    department_name: 'Marketing',
    position: 'Marketing and Communications Lead',
    avatar_url: null,
  };
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
    if (url.pathname === '/api/departments') {
      await route.fulfill({
        json: {
          data: [
            { id: 'operations', name: 'Operations' },
            { id: 'marketing', name: 'Marketing' },
          ],
          pagination: { page: 1, pageSize: 200, total: 2, totalPages: 1 },
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
  await page.route('**/api/directory?**', async (route) => {
    const url = new URL(route.request().url());
    const isLeadPicker =
      url.searchParams.get('page_size') === '25' || url.searchParams.has('user_ids');
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const matches = isLeadPicker && person.full_name.toLowerCase().includes(search);
    await route.fulfill({
      json: {
        data: matches ? [person] : [],
        metadata: {
          total: 0,
          active: 0,
          interns: 0,
          onLeave: 0,
          probation: 0,
          terminated: 0,
          availableRoles: ['employee', 'associate'],
        },
        pagination: {
          page: 1,
          pageSize: isLeadPicker ? 25 : 20,
          total: matches ? 1 : 0,
          totalPages: 1,
        },
      },
    });
  });
  await page.route('**/api/departments/leads', async (route) => {
    if (route.request().method() === 'POST') {
      const input = route.request().postDataJSON();
      const appointment = {
        id: `appointment-${input.departmentId}`,
        department_id: input.departmentId,
        user_id: input.userId,
        name: person.full_name,
        appointed_at: new Date().toISOString(),
        avatarUrl: null,
        position: person.position,
      };
      appointments.push(appointment);
      await route.fulfill({ status: 201, json: { data: appointment } });
    } else if (route.request().method() === 'DELETE') {
      const input = route.request().postDataJSON();
      const index = appointments.findIndex(
        (lead) => lead.department_id === input.departmentId && lead.user_id === input.userId
      );
      if (index >= 0) appointments.splice(index, 1);
      await route.fulfill({ json: { success: true } });
    } else {
      await route.fulfill({ json: { data: appointments } });
    }
  });
});

test('super-admin can search across departments and appoint the same lead twice', async ({
  page,
}, testInfo) => {
  const errors: Array<string> = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const failedRequests: Array<string> = [];
  const peopleSearches: Array<URL> = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/directory' && url.searchParams.get('search') === 'Alex') {
      peopleSearches.push(url);
    }
  });
  page.on('requestfailed', (request) => {
    if (!request.url().includes('/api/directory?')) failedRequests.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/admin/directory', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Manage departments' }).click();

  const dialog = page.getByRole('dialog', { name: 'Manage department leads' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/One person can lead multiple departments/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Choose', exact: true })).toBeDisabled();
  await dialog.getByRole('combobox', { name: 'Department', exact: true }).click();
  await page.getByRole('option', { name: 'Operations' }).click();
  await dialog.getByRole('button', { name: 'Choose', exact: true }).click();
  await dialog.getByLabel('New lead', { exact: true }).fill('Nobody matches');
  await expect(dialog.getByText('No matching people.')).toBeVisible();
  await dialog.getByLabel('New lead', { exact: true }).fill('Alex');
  const result = dialog.getByRole('button', { name: /Alex Marketing/ });
  await expect(result).toBeVisible();
  expect(peopleSearches.length).toBeGreaterThan(0);
  expect(peopleSearches[0].searchParams.has('department')).toBe(false);
  expect(peopleSearches[0].searchParams.has('roles')).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('department-leads-search-desktop.png') });
  await result.focus();
  await page.keyboard.press('Enter');
  await dialog.getByRole('button', { name: 'Add lead', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Remove Alex Marketing as Operations lead' })
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Choose', exact: true }).click();
  await expect(dialog.getByText('No matching people.')).toBeVisible();
  await dialog.locator('button[aria-controls="department-lead-search-results"]').click();
  await page.screenshot({ path: testInfo.outputPath('department-leads-desktop.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  await dialog.getByRole('combobox', { name: 'Department', exact: true }).click();
  await page.getByRole('option', { name: 'Marketing', exact: true }).click();
  await dialog.getByRole('button', { name: 'Choose', exact: true }).click();
  await dialog.getByLabel('New lead', { exact: true }).fill('Alex');
  await expect(dialog.getByRole('button', { name: /Alex Marketing/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('department-leads-search-mobile.png') });
  await dialog.getByRole('button', { name: /Alex Marketing/ }).click();
  await dialog.getByRole('button', { name: 'Add lead', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Remove Alex Marketing as Marketing lead' })
  ).toBeVisible();
  await dialog.getByRole('combobox', { name: 'Department', exact: true }).click();
  await page.getByRole('option', { name: 'Operations', exact: true }).click();
  await dialog.getByRole('button', { name: 'Remove Alex Marketing as Operations lead' }).click();
  await expect(dialog.getByText('No department leads assigned.')).toBeVisible();
  await dialog.getByRole('combobox', { name: 'Department', exact: true }).click();
  await page.getByRole('option', { name: 'Marketing', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Remove Alex Marketing as Marketing lead' })
  ).toBeVisible();
  const bounds = await dialog.evaluate((element) => ({
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
  }));
  expect(bounds.left).toBeGreaterThanOrEqual(14);
  expect(bounds.right).toBeLessThanOrEqual(376);
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('department-leads-mobile.png') });
  expect(errors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test('department lead assignment reports failures and keeps the selection for retry', async ({
  page,
}) => {
  let finishRequest = (): void => {
    throw new Error('Pending request was not initialized');
  };
  const pendingRequest = new Promise<void>((resolve) => {
    finishRequest = resolve;
  });
  await page.route('**/api/departments/leads', async (route) => {
    if (route.request().method() === 'POST') {
      await pendingRequest;
      await route.fulfill({ status: 500, json: { error: 'Could not save appointment' } });
    } else await route.fallback();
  });
  await page.goto('/admin/directory', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Manage departments' }).click();
  const dialog = page.getByRole('dialog', { name: 'Manage department leads' });
  await dialog.getByRole('combobox', { name: 'Department', exact: true }).click();
  await page.getByRole('option', { name: 'Operations', exact: true }).click();
  await dialog.getByRole('button', { name: 'Choose', exact: true }).click();
  await dialog.getByRole('button', { name: /Alex Marketing/ }).click();
  await dialog.getByRole('button', { name: 'Add lead', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Adding', exact: false })).toBeDisabled();
  await expect(dialog.getByRole('combobox', { name: 'Department', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: /Remove Alex/ })).toHaveCount(0);
  finishRequest();
  await expect(page.getByText('Could not save appointment')).toBeVisible();
  await expect(dialog.getByText('Alex Marketing', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Remove Alex/ })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Add lead', exact: true })).toBeEnabled();
});

test('department lead loading failure is explicit and recoverable', async ({ page }) => {
  let failed = false;
  await page.route('**/api/departments/leads', async (route) => {
    if (!failed) {
      await route.fulfill({ status: 500, json: { error: 'Could not load department leads' } });
    } else await route.fallback();
  });
  await page.goto('/admin/directory', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Manage departments' }).click();
  const dialog = page.getByRole('dialog', { name: 'Manage department leads' });
  await expect(dialog.getByRole('alert')).toContainText('Could not load department leads.');
  await expect(dialog.getByText('No department leads assigned.')).toHaveCount(0);
  failed = true;
  await dialog.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await expect(dialog.getByText('No department leads assigned.')).toHaveCount(2);
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
