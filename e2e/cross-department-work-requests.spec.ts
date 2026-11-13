import { expect, test } from '@playwright/test';

const REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const DEPARTMENT_ID = '22222222-2222-4222-8222-222222222222';
const ASSIGNEE_ID = '33333333-3333-4333-8333-333333333333';

test('department lead reviews, assigns, and verifies the responsive request flow', async ({
  page,
}, testInfo) => {
  const consoleErrors: Array<string> = [];
  const failedRequests: Array<string> = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  await page.addInitScript(() => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'lead-1',
        name: 'Operations Lead',
        email: 'lead@test.com',
        role: 'employee',
        isOnboardingComplete: true,
      })
    );
  });
  await page.route('**/api/**', (route) => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/notifications?**', (route) =>
    route.fulfill({
      json: {
        data: [],
        unreadCount: 0,
        pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0 },
      },
    })
  );
  await page.route('**/api/work-tracker?**', (route) =>
    route.fulfill({
      json: {
        scope: 'team',
        days: 30,
        canAssignTasks: true,
        canViewTeam: true,
        teamLabel: 'My department',
        usageAvailable: false,
        usageRestricted: true,
        projects: [],
        people: [],
        unassignedTaskCount: 0,
      },
    })
  );
  await page.route('**/api/work-requests?**', (route) => {
    const review = new URL(route.request().url()).searchParams.get('view') === 'review';
    return route.fulfill({
      json: {
        data: review
          ? [
              {
                id: REQUEST_ID,
                requester_id: 'requester-1',
                requester_name: 'Mary Santos',
                source_department_id: 'source-1',
                source_department_name: 'Marketing',
                target_department_id: DEPARTMENT_ID,
                target_department_name: 'Operations',
                project_id: null,
                project_name: null,
                milestone_id: null,
                suggested_assignee_id: null,
                suggested_assignee_name: null,
                assigned_to: null,
                assigned_to_name: null,
                reviewed_by: null,
                reviewer_name: null,
                created_task_id: null,
                title: 'Validate the Google account setup',
                description: 'Confirm access and document the approved setup.',
                priority: 'high',
                due_date: '2026-11-20T00:00:00.000Z',
                status: 'pending',
                decision_note: null,
                created_at: '2026-11-13T00:00:00.000Z',
                updated_at: '2026-11-13T00:00:00.000Z',
                decided_at: null,
              },
            ]
          : [],
        assigneeOptions: review
          ? [
              {
                id: ASSIGNEE_ID,
                departmentId: DEPARTMENT_ID,
                name: 'Alex Operations',
                avatarUrl: null,
              },
            ]
          : [],
        canReview: true,
        pendingCount: review ? 1 : 0,
      },
    });
  });
  await page.route(`**/api/work-requests/${REQUEST_ID}`, async (route) => {
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().postDataJSON()).toMatchObject({
      action: 'approve',
      assigneeId: ASSIGNEE_ID,
    });
    await route.fulfill({ json: { data: { id: REQUEST_ID, status: 'approved' } } });
  });
  await page.route('**/api/departments?**', (route) =>
    route.fulfill({
      json: {
        data: [{ id: DEPARTMENT_ID, name: 'Operations' }],
        pagination: { page: 1, pageSize: 200, total: 1, totalPages: 1 },
      },
    })
  );
  await page.route('**/api/projects?**', (route) =>
    route.fulfill({ json: { data: [], pagination: { page: 1, pageSize: 100, total: 0 } } })
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/work-tracker?view=requests&requestScope=review', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: 'Department requests' })).toBeVisible();
  await expect(page.getByText('Validate the Google account setup')).toBeVisible();
  await expect(page.getByText('Marketing')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('department-requests-desktop.png'),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Review request' }).click();
  await page.getByLabel('Assignee').click();
  await page.getByRole('option', { name: 'Alex Operations' }).click();
  await page.getByRole('button', { name: 'Approve & assign' }).click();
  await expect(page.getByText('Request approved and assigned')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Department requests' })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('department-requests-mobile.png'),
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
