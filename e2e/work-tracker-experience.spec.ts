import { expect, test } from '@playwright/test';

test.setTimeout(120_000);

const projects = [
  {
    id: 'project-1',
    name: 'Launch readiness',
    description: 'Prepare the launch',
    status: 'active',
    health: 'blocked',
    progressPct: 40,
    dueDate: '2026-11-15',
    nextMilestone: { title: 'Approval checkpoint', dueDate: '2026-10-20' },
    leadUserId: 'emp-1',
    leadName: 'Alex Associate',
    leadAvatarUrl: null,
    totalTasks: 5,
    completedTasks: 3,
    blockedTasks: 1,
    overdueTasks: 0,
  },
];

const tasks = Array.from({ length: 12 }, (_, index) => ({
  id: `task-${index + 1}`,
  title: `Launch task ${index + 1}`,
  description: null,
  assigned_to: 'emp-1',
  assigned_by: 'admin-1',
  priority: 'medium',
  status: index === 0 ? 'blocked' : 'pending',
  category: null,
  tags: [],
  due_date: null,
  completed_at: null,
  created_at: `2026-10-01T00:00:${String(index).padStart(2, '0')}.000Z`,
  updated_at: '2026-10-01T00:00:00.000Z',
  created_by: 'admin-1',
  deleted_at: null,
  project_id: 'project-1',
  milestone_id: null,
  blocked_reason: index === 0 ? 'Waiting for review' : null,
}));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'admin-1',
        name: 'Sample Admin',
        email: 'admin@test.com',
        role: 'super_admin',
        isOnboardingComplete: true,
      })
    );
  });
  await page.route('**/api/work-tracker?**', async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      json: {
        scope: url.searchParams.get('scope') ?? 'team',
        days: Number(url.searchParams.get('days') ?? 30),
        usageAvailable: true,
        projects,
        unassignedTaskCount: 0,
        people: [
          {
            userId: 'emp-1',
            name: 'Alex Associate',
            department: 'Operations',
            role: 'associate',
            avatarUrl: null,
            activeProjectCount: 1,
            averageProjectProgress: 40,
            openTaskCount: 12,
            completedTaskCount: 2,
            blockedCount: 1,
            overdueCount: 0,
            lastActiveAt: null,
            activeDays: 1,
            sessionCount: 1,
            items: [
              {
                source: 'task',
                id: 'task-2',
                title: 'Launch task 2',
                description: null,
                status: 'pending',
                priority: 'medium',
                dueDate: null,
                updatedAt: '2026-10-01T00:00:00.000Z',
                href: '/tasks/task-2',
                projectId: 'project-1',
                projectName: 'Launch readiness',
                milestoneId: null,
                milestoneName: null,
                blockedReason: null,
              },
            ],
          },
        ],
      },
    });
  });
  await page.route('**/api/tasks?**', async (route) => {
    const url = new URL(route.request().url());
    const pageNumber = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10);
    await route.fulfill({
      json: {
        data: tasks.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
        pagination: {
          page: pageNumber,
          pageSize,
          total: tasks.length,
          totalPages: Math.ceil(tasks.length / pageSize),
        },
      },
    });
  });
});

test('roadmap shows risk and target date, then keeps context into execution', async ({ page }) => {
  await page.goto('/work-tracker?view=roadmap&scope=team&days=7', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: 'Project Roadmap' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('Nov 15, 2026')).toBeVisible();
  await expect(page.getByText(/Next milestone: Approval checkpoint/)).toBeVisible({
    timeout: 30_000,
  });
  await page.screenshot({ path: 'test-results/work-tracker-roadmap-desktop.png', fullPage: true });
  await page.evaluate(() => localStorage.setItem('theme', 'dark'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByText(/Next milestone: Approval checkpoint/)).toBeVisible({
    timeout: 30_000,
  });
  await page.screenshot({ path: 'test-results/work-tracker-roadmap-dark.png', fullPage: true });
  await page.getByRole('link', { name: '3/5 tasks' }).click();
  await expect(page).toHaveURL(/view=execution/, { timeout: 30_000 });
  await expect(page).toHaveURL(/project=project-1/);
  await page
    .getByRole('navigation', { name: 'Work Tracker sections' })
    .getByRole('link', { name: 'Team Workload' })
    .click();
  await expect(page).toHaveURL(/scope=team/);
  await expect(page).toHaveURL(/days=7/);
});

test('board identifies its bounded page and excludes cancelled work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let boardRequestedActiveOnly = false;
  page.on('request', (request) => {
    if (request.url().includes('/api/tasks?')) {
      boardRequestedActiveOnly ||=
        new URL(request.url()).searchParams.get('excludeCancelled') === 'true';
    }
  });
  await page.goto('/work-tracker?view=execution&scope=team', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Showing 1–10 of 12 active tasks/)).toBeVisible();
  expect(boardRequestedActiveOnly).toBe(true);
  await expect(page.getByTestId('kanban-task-task-1')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText(/Showing 11–12 of 12 active tasks/)).toBeVisible();
  await page.screenshot({ path: 'test-results/work-tracker-execution-mobile.png', fullPage: true });
});

test('filtered empty board offers a way back', async ({ page }) => {
  await page.route('**/api/tasks?**', async (route) => {
    await route.fulfill({
      json: {
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      },
    });
  });
  await page.goto('/work-tracker?view=execution&project=project-1', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByText('No matching tasks')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).last().click();
  await expect(page).not.toHaveURL(/project=project-1/);
});

test('summary error can be retried', async ({ page }) => {
  let fail = true;
  await page.route('**/api/work-tracker?**', async (route) => {
    if (fail) {
      await route.fulfill({ status: 500, json: { error: 'Unavailable' } });
    } else {
      await route.fallback();
    }
  });
  await page.goto('/work-tracker?view=team&scope=team', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Work tracker unavailable')).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Current staff workload')).toBeVisible();
});

test('team task status opens an accessible blocker dialog', async ({ page }) => {
  await page.goto('/work-tracker?view=team&scope=team', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Alex Associate/ }).click();
  await page.getByRole('combobox', { name: 'Update Launch task 2 status' }).click();
  await page.getByRole('option', { name: 'Blocked' }).click();
  await expect(page.getByRole('dialog', { name: 'What is blocking this task?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move to Blocked' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Blocker reason' }).fill('Waiting for approval');
  await expect(page.getByRole('button', { name: 'Move to Blocked' })).toBeEnabled();
});
