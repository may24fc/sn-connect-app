import { expect, test } from '@playwright/test';

test.setTimeout(150_000);

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`completed milestone checklist can be submitted on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    const errors: Array<string> = [];
    let submitted = false;
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(() => {
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          id: 'alex',
          name: 'Alex Creator',
          email: 'alex@example.test',
          role: 'employee',
          isOnboardingComplete: true,
        })
      );
      localStorage.setItem('weekly-commit-dismissed:project-1', 'true');
    });

    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/projects/project-1') {
        await route.fulfill({
          json: {
            data: {
              id: 'project-1',
              name: 'Website update',
              description: null,
              lead_user_id: 'alex',
              supervisor_id: null,
              created_by: 'alex',
              start_date: '2026-11-01',
              target_end_date: '2026-12-01',
              status: 'active',
              health: 'on_track',
              progress_pct: 0,
              points_total: 100,
              earned_points: 0,
              can_manage: true,
              contributors: [{ user_id: 'alex', role: 'lead', name: 'Alex Creator' }],
              contributor_people: [],
              lead_user_ids: ['alex'],
              lead_name: 'Alex Creator',
            },
          },
        });
      } else if (url.pathname === '/api/projects/project-1/milestones') {
        await route.fulfill({
          json: {
            data: [
              {
                id: 'month-1',
                project_id: 'project-1',
                parent_milestone_id: null,
                period_type: 'month',
                title: 'Product pricing update',
                description: null,
                period_start: '2026-11-01',
                period_end: '2026-11-30',
                due_date: '2026-11-30',
                status: submitted ? 'completed' : 'in_progress',
                progress_pct: 0,
                submitted_at: null,
                submitted_by: null,
                approved_at: null,
                approved_by: null,
                completed_at: submitted ? '2026-11-20T00:00:00Z' : null,
                completed_by: submitted ? 'alex' : null,
                position: 0,
                complexity_tier: 'standard',
                department: null,
                created_at: '2026-11-01T00:00:00Z',
                updated_at: '2026-11-20T00:00:00Z',
                deleted_at: null,
              },
            ],
          },
        });
      } else if (url.pathname === '/api/projects/milestones/month-1/checklist') {
        await route.fulfill({
          json: {
            data: [
              {
                id: 'item-1',
                milestone_id: 'month-1',
                title: 'Review all prices',
                description: null,
                status: 'done',
                position: 0,
                completed_at: '2026-11-19T00:00:00Z',
                completed_by: 'alex',
                created_at: '2026-11-01T00:00:00Z',
                updated_at: '2026-11-19T00:00:00Z',
              },
            ],
          },
        });
      } else if (url.pathname === '/api/projects/milestones/month-1/submit') {
        submitted = true;
        await route.fulfill({ json: { data: { id: 'month-1', status: 'completed' } } });
      } else if (url.pathname === '/api/notifications') {
        await route.fulfill({
          json: {
            data: [],
            unreadCount: 0,
            pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
          },
        });
      } else {
        await route.fulfill({ json: { data: [] } });
      }
    });

    await page.goto('/projects/project-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Product pricing update')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('100%').first()).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}-ready.png`),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Complete milestone' }).click();
    await expect.poll(() => submitted).toBe(true);
    await expect(page.getByText('Milestone completed', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Complete milestone' })).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}-completed.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
