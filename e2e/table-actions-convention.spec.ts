import { expect, test } from '@playwright/test';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('super-admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 90_000 });
}

async function expectRightAlignedActions(page: import('@playwright/test').Page) {
  const actions = page.getByRole('columnheader', { name: 'Actions', exact: true }).first();
  await expect(actions).toBeVisible({ timeout: 30_000 });
  await expect(actions).toHaveCSS('text-align', 'right');
}

test('keeps action columns right-aligned across Control Hub tables', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const browserErrors: Array<string> = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('/admin/directory');
  await expect(page.getByRole('heading', { name: 'Company Directory' })).toBeVisible();
  await expectRightAlignedActions(page);
  await page.screenshot({ path: testInfo.outputPath('directory-actions.png'), fullPage: true });

  await page.goto('/ai-spending');
  await expect(page.getByRole('heading', { name: 'AI Spending Tracker' })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('tab', { name: 'Manual Entries' }).click();
  await expectRightAlignedActions(page);
  await page.screenshot({ path: testInfo.outputPath('ai-spending-actions.png'), fullPage: true });

  await page.goto('/admin/marketing/ad-spend');
  await expect(page.getByRole('heading', { name: 'Ad Spend' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('tab', { name: 'Manual Entry Details' }).click();
  await expectRightAlignedActions(page);
  await page.screenshot({ path: testInfo.outputPath('marketing-actions.png'), fullPage: true });

  expect(browserErrors).toEqual([]);
});
