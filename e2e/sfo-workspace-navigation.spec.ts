import { expect, test } from '@playwright/test';

test.setTimeout(240_000);

async function expectCrmSectionBelowPerformanceCharts(page: import('@playwright/test').Page) {
  const chartCard = page
    .getByRole('heading', { name: 'Monthly ad spend by platform' })
    .locator('xpath=ancestor::div[contains(@class,"rounded-[10px]")][1]');
  const crmSection = page
    .getByRole('heading', { name: 'CRM Tracker · unchanged' })
    .locator('xpath=ancestor::section[1]');

  await expect(chartCard).toBeVisible({ timeout: 45_000 });
  await expect(crmSection).toBeVisible({ timeout: 45_000 });

  const [chartBox, crmBox] = await Promise.all([chartCard.boundingBox(), crmSection.boundingBox()]);
  expect(chartBox).not.toBeNull();
  expect(crmBox).not.toBeNull();
  if (!(chartBox && crmBox)) throw new Error('Expected chart and CRM section layout boxes');
  expect(crmBox.y).toBeGreaterThanOrEqual(chartBox.y + chartBox.height + 16);
}

test('SFO Performance navigation keeps the Seafood Factory Outlet workspace active', async ({
  page,
}, testInfo) => {
  const consoleErrors: Array<string> = [];
  const failedRequests: Array<string> = [];

  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? '';
    if (!/ERR_ABORTED|NS_BINDING_ABORTED/.test(reason)) {
      failedRequests.push(`${request.url()} (${reason})`);
    }
  });
  const emailInput = page.getByLabel('Email');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    if (await emailInput.isVisible()) break;
  }
  await expect(emailInput).toBeVisible();
  await emailInput.fill('super-admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 90_000 });

  await page.goto('/admin/reports', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByRole('button', { name: 'Current workspace: Seafood Factory Outlet' })
  ).toBeVisible({ timeout: 45_000 });
  await page.goto('/sfo/performance', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/sfo\/performance$/, { timeout: 60_000 });
  await expect(
    page.getByRole('button', { name: 'Current workspace: Seafood Factory Outlet' })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'SFO Performance' })).toHaveClass(/bg-white\/12/);
  await expectCrmSectionBelowPerformanceCharts(page);
  await page.screenshot({
    path: testInfo.outputPath('sfo-performance-desktop.png'),
    fullPage: true,
  });
  await page.getByRole('heading', { name: 'CRM Tracker · unchanged' }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('sfo-performance-crm-layout-desktop.png'),
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expectCrmSectionBelowPerformanceCharts(page);
  await page.getByRole('heading', { name: 'CRM Tracker · unchanged' }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('sfo-performance-crm-layout-mobile.png'),
  });
  await page.getByRole('button', { name: 'Toggle menu' }).click();
  const mobileNavigation = page.getByRole('dialog', { name: 'Main navigation' });
  await expect(
    mobileNavigation.getByRole('button', {
      name: 'Current workspace: Seafood Factory Outlet',
    })
  ).toBeVisible();
  await expect(mobileNavigation.getByRole('button', { name: 'SFO Performance' })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('sfo-performance-mobile.png'),
    fullPage: true,
  });

  await page.evaluate(() => localStorage.setItem('theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Toggle menu' }).click();
  await expect(
    page
      .getByRole('dialog', { name: 'Main navigation' })
      .getByRole('button', { name: 'Current workspace: Seafood Factory Outlet' })
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('sfo-performance-mobile-dark.png'),
    fullPage: true,
  });

  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
