import { expect, test } from '@playwright/test';

test.setTimeout(120_000);

const project = {
  id: 'project-1',
  name: 'Quarterly launch plan',
  description: 'Coordinate the launch across teams.',
  lead_user_id: 'associate-1',
  supervisor_id: null,
  start_date: '2026-10-01',
  target_end_date: '2026-12-15',
  status: 'active',
  health: 'on_track',
  progress_pct: 35,
  points_total: 600,
  earned_points: 120,
  created_by: 'associate-1',
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-12T00:00:00.000Z',
  deleted_at: null,
  contributors: [
    {
      user_id: 'associate-1',
      role: 'lead',
      joined_at: '2026-10-01T00:00:00.000Z',
      name: 'Ceferino Jumao-as V',
      avatar_url: null,
    },
  ],
};

const candidates = [
  ['candidate-1', 'Shane Anne Evangelista', 'PA/EA to the CEO', 'EA/PA'],
  ['candidate-2', 'Steven Nhan', 'Chief Executive Officer', 'Operations'],
  ['candidate-3', 'Thea Patricia Arellano', 'Digital Content Associate', 'Marketing'],
  ['candidate-4', 'Tina Olavia', 'Property and Administration Officer', 'EA/PA'],
].map(([user_id, full_name, position, department_name]) => ({
  user_id,
  full_name,
  position,
  department_name,
  role: 'employee',
  avatar_url: null,
}));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'associate-1',
        name: 'Ceferino Jumao-as V',
        email: 'associate@test.com',
        role: 'associate',
        isOnboardingComplete: true,
      })
    );
    localStorage.setItem('weekly-commit-dismissed:project-1', 'true');
  });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/projects/project-1/contributors') {
      await route.fulfill({ json: { data: candidates, total: candidates.length } });
      return;
    }
    if (url.pathname === '/api/projects/project-1') {
      await route.fulfill({ json: { data: project } });
      return;
    }
    if (
      url.pathname === '/api/projects/project-1/milestones' ||
      url.pathname === '/api/projects/project-1/documentation' ||
      url.pathname === '/api/leaderboard' ||
      url.pathname === '/api/weekly-commitments'
    ) {
      await route.fulfill({ json: { data: [] } });
      return;
    }
    await route.fulfill({ json: { data: [] } });
  });
});

test('manage contributors is prominent and the dialog stays contained', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/projects/project-1', { waitUntil: 'domcontentloaded' });

  const manageButton = page.getByRole('button', { name: 'Manage contributors' });
  await expect(manageButton).toBeVisible({ timeout: 30_000 });
  await expect(manageButton).toHaveClass(/border-primary/);
  await manageButton.click();

  const dialog = page.getByRole('dialog', { name: 'Manage Contributors' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Current contributors')).toBeVisible();
  await expect(dialog.getByText('Ceferino Jumao-as V')).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Remove Ceferino/ })).toHaveCount(0);
  await expect(dialog.getByText('Lead', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Search people')).toBeVisible();

  const desktopBounds = await dialog.evaluate((element) => ({
    bottom: element.getBoundingClientRect().bottom,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(desktopBounds.bottom).toBeLessThanOrEqual(704);
  expect(desktopBounds.scrollWidth).toBe(desktopBounds.clientWidth);
  await page.screenshot({ path: 'test-results/project-contributors-dialog-desktop.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(manageButton).toBeVisible({ timeout: 30_000 });
  await manageButton.click();
  const mobileDialog = page.getByRole('dialog', { name: 'Manage Contributors' });
  await expect(mobileDialog).toBeVisible();
  const mobileBounds = await mobileDialog.evaluate((element) => ({
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(mobileBounds.left).toBeGreaterThanOrEqual(14);
  expect(mobileBounds.right).toBeLessThanOrEqual(376);
  expect(mobileBounds.scrollWidth).toBe(mobileBounds.clientWidth);
  await page.screenshot({ path: 'test-results/project-contributors-dialog-mobile.png' });
});
