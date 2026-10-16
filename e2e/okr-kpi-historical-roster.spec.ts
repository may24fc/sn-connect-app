import { expect, test } from '@playwright/test';

const cycles = [
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Q2 2026',
    description: null,
    start_date: '2026-04-01',
    end_date: '2026-06-30',
    okr_submission_deadline: null,
    kpi_submission_deadline: null,
    self_review_deadline: null,
    status: 'completed',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Q3 2026',
    description: null,
    start_date: '2026-07-01',
    end_date: '2026-09-30',
    okr_submission_deadline: null,
    kpi_submission_deadline: null,
    self_review_deadline: null,
    status: 'active',
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
  },
];

const formerEmployee = {
  user_id: 'former-user',
  employee_id: 'former-employee',
  avatar_url: null,
  full_name: 'Former Employee',
  first_name: 'Former',
  middle_name: null,
  last_name: 'Employee',
  role: 'employee',
  department_name: 'Operations',
  department_id: null,
  division_name: null,
  division_id: null,
  position: 'Operations Specialist',
  status: 'terminated',
  employment_type: 'regular',
  start_date: '2025-01-01',
  date_terminated: '2026-05-15T12:00:00.000Z',
  email: 'former@example.com',
};

const activeEmployee = {
  ...formerEmployee,
  user_id: 'active-user',
  employee_id: 'active-employee',
  full_name: 'Existing Employee',
  first_name: 'Existing',
  status: 'active',
  date_terminated: null,
  email: 'existing@example.com',
};

const futureEmployee = {
  ...activeEmployee,
  user_id: 'future-user',
  employee_id: 'future-employee',
  full_name: 'Future Employee',
  first_name: 'Future',
  email: 'future@example.com',
};

const formerEmployeeWithoutQuarterData = {
  ...formerEmployee,
  user_id: 'former-no-data-user',
  employee_id: 'former-no-data-employee',
  full_name: 'Former Without Quarter Data',
  first_name: 'Former Without',
  email: 'former-no-data@example.com',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'admin-user',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        isOnboardingComplete: true,
      })
    );
    localStorage.setItem(
      'admin-performance-selected-cycle-id',
      '10000000-0000-4000-8000-000000000002'
    );
  });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/performance/cycles') {
      await route.fulfill({ json: { data: cycles } });
      return;
    }

    if (url.pathname === '/api/performance/okrs') {
      await route.fulfill({
        json: {
          data: [
            {
              id: 'former-okr',
              employee_id: 'former-employee',
              cycle_id: '10000000-0000-4000-8000-000000000002',
              objective: 'Complete historical objective',
              description: null,
              key_results: [],
              progress: 100,
              status: 'completed',
              weight: 1,
              admin_rating: null,
              admin_comments: null,
              evaluated_by: null,
              evaluated_at: null,
              evaluator_first_name: null,
              evaluator_role: null,
              created_at: '2026-04-01T00:00:00.000Z',
              updated_at: '2026-05-01T00:00:00.000Z',
            },
          ],
        },
      });
      return;
    }

    if (url.pathname === '/api/performance/individual/former-employee') {
      await route.fulfill({
        json: {
          employee: {
            id: 'former-employee',
            userId: 'former-user',
            fullName: 'Former Employee',
            position: 'Operations Specialist',
            department: 'Operations',
            status: 'terminated',
            employmentType: 'regular',
            dateHired: '2025-01-01',
            avatarUrl: null,
            role: 'employee',
            email: 'former@example.com',
          },
          kpis: [],
          kpiSummary: { total: 0, completed: 0, avgProgress: 0 },
          okrs: [
            {
              id: 'former-okr',
              employee_id: 'former-employee',
              cycle_id: '10000000-0000-4000-8000-000000000002',
              objective: 'Complete historical objective',
              description: null,
              key_results: [],
              progress: 100,
              weight: 1,
              status: 'completed',
              evaluated_by: null,
              evaluated_at: null,
              evaluator_first_name: null,
              evaluator_position: null,
              evaluator_role: null,
              admin_comments: null,
              admin_rating: null,
              created_at: '2026-04-01T00:00:00.000Z',
            },
          ],
          okrTargets: [],
          okrSummary: { total: 1, completed: 1, avgProgress: 100 },
          reviews: [],
          latestReview: null,
        },
      });
      return;
    }

    if (url.pathname === '/api/directory') {
      const isCycleScopedRequest =
        url.searchParams.get('created_through') === '2026-06-30' &&
        url.searchParams.get('performance_cycle_id') === '10000000-0000-4000-8000-000000000002';
      const data = isCycleScopedRequest && url.searchParams.get('status') === 'terminated'
        ? [formerEmployee]
        : isCycleScopedRequest
          ? [activeEmployee]
        : [activeEmployee, formerEmployee, formerEmployeeWithoutQuarterData, futureEmployee];
      await route.fulfill({
        json: {
          data,
          metadata: {
            total: data.length,
            active: 1,
            interns: 0,
            onLeave: 0,
            probation: 0,
            terminated: 1,
            availableRoles: ['employee'],
          },
          pagination: { page: 1, pageSize: 20, total: data.length, totalPages: 1 },
        },
      });
      return;
    }

    if (url.pathname === '/api/departments') {
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

test('selected quarter defaults to current staff and offers a former-only roster', async ({
  page,
}, testInfo) => {
  const consoleErrors: Array<string> = [];
  const failedRequests: Array<string> = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') {
      failedRequests.push(request.url());
    }
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/performance', { waitUntil: 'networkidle' });

  await expect(page.getByText('Q2 2026', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Existing Employee', { exact: true })).toBeVisible();
  await expect(page.getByText('Former Employee', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Future Employee', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Former Without Quarter Data', { exact: true })).toHaveCount(0);

  await page.getByRole('combobox').filter({ hasText: 'Highest OWA First' }).click();
  await page.getByRole('option', { name: 'Former Employees' }).click();

  await expect(page.getByText('Former Employee', { exact: true })).toBeVisible();
  await expect(page.getByText('Former', { exact: true })).toBeVisible();
  await expect(page.getByText('Existing Employee', { exact: true })).toHaveCount(0);
  await expect(page.getByText('100%')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('desktop-historical-roster.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.getByText('Former Employee', { exact: true })).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  expect(hasHorizontalOverflow).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath('mobile-dark-historical-roster.png'),
    fullPage: true,
  });

  await page
    .getByRole('button')
    .filter({ has: page.getByText('Former Employee', { exact: true }) })
    .click();
  await expect(page).toHaveURL(/\/admin\/performance\/employee\/former-employee$/, {
    timeout: 30_000,
  });
  await expect(page.getByRole('heading', { name: 'Former Employee' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Q2 2026' })).toBeVisible();

  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
