import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
test(`employee sees mutation failures and restored notification at ${viewport.width}px`, async ({ page }) => {
  await page.setViewportSize(viewport);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript((dark) => {
    if (dark) localStorage.setItem('theme', 'dark');
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'emp-1', name: 'Sample Employee', email: 'employee@example.com',
      role: 'employee', isOnboardingComplete: true,
    }));
  }, viewport.width === 390);

  await page.route('**/api/notifications?*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fulfill({ status: 500, json: { error: 'Simulated failure' } });
      return;
    }
    await route.fulfill({ json: {
      data: [{
        id: 'notification-1', user_id: 'emp-1', type: 'system', title: 'Audit notification',
        message: 'Check the current state', link: null, is_read: false, read_at: null,
        metadata: {}, created_at: new Date().toISOString(), expires_at: null,
      }],
      unreadCount: 1,
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    } });
  });
  await page.route('**/api/notifications', async (route) => {
    await route.fulfill({ status: 500, json: { error: 'Simulated failure' } });
  });

  await page.goto('/notifications');
  if (viewport.width === 390) await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByText('Audit notification')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Mark All Read' }).click();
  await expect(page.getByText('Failed to mark all as read')).toBeVisible();
  await expect(page.getByText('Audit notification')).toBeVisible();

  await page.getByText('Audit notification').hover();
  await page.getByRole('button', { name: 'Delete notification' }).click();
  await expect(page.getByText('Failed to delete notification')).toBeVisible();
  await expect(page.getByText('Audit notification')).toBeVisible();
  await page.screenshot({ path: `test-results/notification-error-toasts-${viewport.width}.png`, fullPage: true });
  expect(pageErrors).toEqual([]);
});
}
