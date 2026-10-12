import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
test(`admin sees offboarding create failure and the optimistic task rolls back at ${viewport.width}px`, async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize(viewport);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript((dark) => {
    if (dark) localStorage.setItem('theme', 'dark');
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'adm-1', name: 'Sample Admin', email: 'admin@test.com',
      role: 'admin', isOnboardingComplete: true,
    }));
  }, viewport.width === 390);

  await page.route('**/api/onboarding/profiles?*', async (route) => {
    await route.fulfill({ json: { data: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 } } });
  });
  await page.route('**/api/offboarding', async (route) => {
    await route.fulfill({ json: { data: [{
      id: 'offboarding-1', employee_id: 'employee-1', exit_type: 'resignation',
      last_working_day: '2026-10-31', status: 'in_progress',
      exit_interview_date: null, exit_interview_notes: null,
      initiated_by: 'adm-1', created_at: '2026-10-12T00:00:00Z',
      updated_at: '2026-10-12T00:00:00Z',
      employee: { id: 'employee-1', user_id: 'emp-1', full_name: 'Sample Employee',
        email: 'employee@example.com', department: 'Operations', position: 'Analyst', role: 'employee' },
      offboarding_tasks: [],
    }] } });
  });
  await page.route('**/api/checklist-templates?*', async (route) => {
    await route.fulfill({ json: { data: { tasks: [], isPersisted: true } } });
  });
  await page.route('**/api/offboarding/offboarding-1/tasks', async (route) => {
    await route.fulfill({ status: 500, json: { error: 'Simulated failure' } });
  });

  await page.goto('/admin/checklists', { waitUntil: 'domcontentloaded' });
  if (viewport.width === 390) await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('tab', { name: 'Offboarding' }).click();
  await page.getByRole('button', { name: 'Open offboarding manager' }).click();
  await page.getByLabel('Title').fill('Return company laptop');
  await page.getByRole('button', { name: 'Add offboarding task' }).click();
  await expect(page.getByText('Failed to add offboarding task')).toBeVisible();
  await page.getByText('Failed to add offboarding task').screenshot({ path: `test-results/offboarding-error-toast-${viewport.width}.png` });
  await page.screenshot({ path: `test-results/offboarding-create-error-toast-${viewport.width}.png` });
  await expect(page.getByText('Return company laptop', { exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(pageErrors).toEqual([]);
});
}
