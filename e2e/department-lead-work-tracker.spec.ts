import { expect, test } from '@playwright/test';

test('department leads get scoped workload without Hub activity data', async ({
  page,
}, testInfo) => {
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
  await page.route('**/api/**', async (route) => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/work-tracker?**', async (route) => {
    await route.fulfill({
      json: {
        scope: 'team',
        days: 30,
        canAssignTasks: true,
        canViewTeam: true,
        teamLabel: 'My department',
        usageAvailable: false,
        usageRestricted: true,
        projects: [],
        unassignedTaskCount: 0,
        people: [
          {
            userId: 'member-1',
            name: 'Alex Operations',
            department: 'Operations',
            role: 'associate',
            avatarUrl: null,
            activeProjectCount: 1,
            averageProjectProgress: 60,
            openTaskCount: 2,
            completedTaskCount: 3,
            blockedCount: 0,
            overdueCount: 0,
            lastActiveAt: null,
            activeDays: 0,
            sessionCount: 0,
            items: [],
          },
        ],
      },
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/work-tracker?view=team&scope=team', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'My department' })).toBeVisible();
  await expect(page.getByText(/work data only/)).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Active days' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Last active' })).toHaveCount(0);
  await expect(page.getByText('Alex Operations')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('department-workload-desktop.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'My department' })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('department-workload-mobile.png'),
    fullPage: true,
  });
});
