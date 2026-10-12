import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`resource targeting uses current roles at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    if (viewport.width === 390) await page.emulateMedia({ colorScheme: 'dark' });
    const consoleErrors: string[] = [];
    const failedApiRequests: string[] = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('requestfailed', (request) => {
      if (request.url().includes('/api/')) failedApiRequests.push(request.url());
    });

    await page.addInitScript((dark) => {
      if (dark) localStorage.setItem('theme', 'dark');
      localStorage.setItem('auth_user', JSON.stringify({
        id: 'emp-1',
        name: 'Sample Employee',
        email: 'employee@example.com',
        role: 'employee',
        isOnboardingComplete: true,
      }));
    }, viewport.width === 390);
    await page.goto('/information-hub/resources/new');
    await expect(page.getByRole('heading', { name: 'Submit Resource' })).toBeVisible();

    await page.getByRole('button', { name: 'Public resource' }).click();
    const targetingToggle = page.getByRole('button', { name: 'Who can access this?' });
    await targetingToggle.click();
    const roles = page.getByPlaceholder('employee, associate, admin, super_admin');
    await expect(roles).toBeVisible();
    if (viewport.width === 390) await expect(page.locator('html')).toHaveClass(/dark/);
    await roles.scrollIntoViewIfNeeded();
    if (viewport.width === 390) {
      await targetingToggle.hover();
      await expect(targetingToggle).toHaveCSS('background-color', 'rgb(39, 39, 42)');
    }
    await page.screenshot({ path: `test-results/resource-target-roles-empty-${viewport.width}.png`, fullPage: true });
    await roles.fill('admin, super_admin');
    await expect(roles).toHaveValue('admin, super_admin');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/resource-target-roles-${viewport.width}.png`, fullPage: true });
    expect(consoleErrors).toEqual([]);
    expect(failedApiRequests).toEqual([]);
  });
}
