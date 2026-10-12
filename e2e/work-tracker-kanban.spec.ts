import { expect, test } from '@playwright/test';

test.setTimeout(120_000);

type BoardTask = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  priority: 'medium';
  status: 'pending' | 'in_progress' | 'blocked' | 'completed';
  category: null;
  tags: Array<string>;
  due_date: null;
  completed_at: null;
  created_at: string;
  updated_at: string;
  created_by: string;
  deleted_at: null;
  project_id: null;
  milestone_id: null;
  blocked_reason: string | null;
};

const initialTask: BoardTask = {
  id: 'task-kanban-1',
  title: 'Prepare launch checklist',
  description: 'Coordinate the launch items.',
  assigned_to: 'emp-1',
  assigned_by: 'adm-1',
  priority: 'medium',
  status: 'pending',
  category: null,
  tags: [],
  due_date: null,
  completed_at: null,
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
  created_by: 'adm-1',
  deleted_at: null,
  project_id: null,
  milestone_id: null,
  blocked_reason: null,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'emp-1',
        name: 'Sample Employee',
        email: 'employee@test.com',
        role: 'employee',
        isOnboardingComplete: true,
      })
    );
  });
  await page.route('**/api/work-tracker?**', async (route) => {
    await route.fulfill({ json: { scope: 'mine', days: 30, projects: [], person: null } });
  });
});

test('moves a card by drag handle and keeps its detail link', async ({ page }) => {
  let task = { ...initialTask };
  await page.route('**/api/tasks?**', async (route) => {
    await route.fulfill({
      json: { data: [task], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    });
  });
  await page.route('**/api/tasks/task-kanban-1', async (route) => {
    const patch = route.request().postDataJSON();
    task = { ...task, status: patch.status, blocked_reason: patch.blockedReason ?? null };
    await route.fulfill({ json: { data: task } });
  });

  await page.goto('/work-tracker?view=execution', { waitUntil: 'domcontentloaded' });
  const card = page.getByTestId('kanban-task-task-kanban-1');
  await expect(
    page.getByTestId('kanban-column-pending').getByTestId('kanban-task-task-kanban-1')
  ).toBeVisible();
  await expect(card.getByRole('link', { name: 'Prepare launch checklist' })).toHaveAttribute(
    'href',
    /\/tasks\/task-kanban-1/
  );

  await card.locator('[draggable="true"]').dragTo(page.getByTestId('kanban-column-in_progress'));
  await expect(
    page.getByTestId('kanban-column-in_progress').getByTestId('kanban-task-task-kanban-1')
  ).toBeVisible();
  await expect(page.getByTestId('kanban-announcement')).toContainText('moved to In Progress');
});

test('supports keyboard moves and asks for a blocker reason', async ({ page }) => {
  let task = { ...initialTask };
  let lastPatch: { status?: string; blockedReason?: string } = {};
  await page.route('**/api/tasks?**', async (route) => {
    await route.fulfill({
      json: { data: [task], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    });
  });
  await page.route('**/api/tasks/task-kanban-1', async (route) => {
    lastPatch = route.request().postDataJSON();
    task = {
      ...task,
      status: lastPatch.status as BoardTask['status'],
      blocked_reason: lastPatch.blockedReason ?? null,
    };
    await route.fulfill({ json: { data: task } });
  });

  await page.goto('/work-tracker?view=execution', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Move Prepare launch checklist' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('menuitem', { name: 'Move to Blocked' }).press('Enter');
  await expect(page.getByRole('dialog', { name: 'What is blocking this task?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move to Blocked' })).toBeDisabled();
  await page.getByLabel('Blocker reason').fill('Waiting for approval');
  await page.getByRole('button', { name: 'Move to Blocked' }).click();

  await expect(
    page.getByTestId('kanban-column-blocked').getByTestId('kanban-task-task-kanban-1')
  ).toBeVisible();
  expect(lastPatch).toEqual({ status: 'blocked', blockedReason: 'Waiting for approval' });
});

test('restores the card when a status update fails', async ({ page }) => {
  await page.route('**/api/tasks?**', async (route) => {
    await route.fulfill({
      json: { data: [initialTask], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    });
  });
  await page.route('**/api/tasks/task-kanban-1', async (route) => {
    await route.fulfill({ status: 500, json: { error: 'Update failed' } });
  });

  await page.goto('/work-tracker?view=execution', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Move Prepare launch checklist' }).click();
  await page.getByRole('menuitem', { name: 'Move to Completed' }).click();

  await expect(
    page.getByTestId('kanban-column-pending').getByTestId('kanban-task-task-kanban-1')
  ).toBeVisible();
  await expect(page.getByTestId('kanban-announcement')).toContainText(
    'Could not move Prepare launch checklist'
  );
  await expect(page.getByRole('alert').filter({ hasText: 'Could not move' })).toContainText(
    'Try again.'
  );
});
