import { type Page, expect, test } from '@playwright/test';

test.use({ timezoneId: 'Asia/Manila' });

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 90_000 });
}

test('loads every Marketing Reports tab through the bounded 500-row contract', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const reportResponses: Array<{ status: number; url: URL }> = [];
  const browserErrors: Array<string> = [];

  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.pathname === '/api/reports') {
      reportResponses.push({ status: response.status(), url });
    }
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('requestfailed', (request) => {
    if (new URL(request.url()).pathname === '/api/reports') {
      browserErrors.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto('/admin/reports');

  await expect(page.getByRole('heading', { name: 'Marketing Reports', exact: true })).toBeVisible();
  await expect(page.getByText('Failed to load marketing reports')).toHaveCount(0);
  await expect(page.getByText('Visible Reports', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Sales Forecast' }).click();
  await expect(page.getByText('Failed to load forecast data')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Compare' }).click();
  await expect(page.getByText('Failed to load comparison data')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Plans' }).click();
  await expect(page.getByText('Unable to load weekly plans')).toHaveCount(0);

  await expect.poll(() => reportResponses.length, { timeout: 90_000 }).toBeGreaterThanOrEqual(5);
  expect(reportResponses.every(({ status }) => status === 200)).toBe(true);
  expect(reportResponses.every(({ url }) => url.searchParams.get('pageSize') === '500')).toBe(true);
  expect(browserErrors).toEqual([]);

  await page.screenshot({
    path: testInfo.outputPath('marketing-reports-desktop.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Submissions' }).click();
  await expect(page.getByText('Visible Reports', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
  await page.screenshot({
    path: testInfo.outputPath('marketing-reports-mobile.png'),
    fullPage: true,
  });
});
