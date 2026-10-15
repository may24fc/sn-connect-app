import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'Asia/Manila' });

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 90_000 });
}

test('applies a custom inclusive metrics range without mobile overflow', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const metricRequests: Array<URL> = [];
  const browserErrors: Array<string> = [];
  let failNextMetricsRequest = false;

  await page.route('**/api/uhp/clients?**', (route) =>
    route.fulfill({ json: { data: [], sources: [] } })
  );
  await page.route('**/api/uhp/clients/metrics?**', async (route) => {
    metricRequests.push(new URL(route.request().url()));
    if (metricRequests.length > 1) await new Promise((resolve) => setTimeout(resolve, 300));
    if (failNextMetricsRequest) {
      failNextMetricsRequest = false;
      await route.fulfill({ status: 500, json: { error: 'Local custom-range test error' } });
      return;
    }
    await route.fulfill({
      json: {
        data: {
          outreachAttempts: 52,
          replies: 5,
          clientsReachedOut: 50,
          repliedAfterOutreach: 5,
          reachedOutClientIds: [],
          repliedClientIds: [],
          activityReplyClientIds: [],
          responseRate: 10,
          interested: 1,
          declined: 0,
          wellnessEvaluationsScheduled: 0,
          callsScheduled: 0,
        },
      },
    });
  });

  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/uhp/clients');
  await expect(page.getByText('Outreach attempts', { exact: true })).toBeVisible();
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    browserErrors.push(`${request.method()} ${request.url()}`);
  });

  await page.getByRole('combobox', { name: 'Metrics period' }).click();
  await page.getByRole('option', { name: 'Custom range' }).click();
  await expect(page.getByText('Start date', { exact: true })).toBeVisible();
  await expect(page.getByText('End date', { exact: true })).toBeVisible();

  await page.getByText('Start date', { exact: true }).locator('..').getByRole('button').click();
  await page.locator('[data-day="2026-10-05"] button').click();
  await page.getByText('End date', { exact: true }).locator('..').getByRole('button').click();
  await page.locator('[data-day="2026-10-12"] button').click();
  await page.getByRole('button', { name: 'Apply date range' }).click();

  const metricsGrid = page.locator('[aria-live="polite"]');
  await expect(metricsGrid).toHaveAttribute('aria-busy', 'true');
  await expect(metricsGrid).toHaveAttribute('aria-busy', 'false');
  await expect.poll(() => metricRequests.length).toBeGreaterThanOrEqual(3);
  const appliedRequest = metricRequests.at(-1);
  expect(appliedRequest?.searchParams.get('from')).toBe('2026-10-04T16:00:00.000Z');
  expect(appliedRequest?.searchParams.get('to')).toBe('2026-10-12T15:59:59.999Z');
  await page.screenshot({ path: testInfo.outputPath('custom-range-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
  await page.screenshot({ path: testInfo.outputPath('custom-range-mobile.png'), fullPage: true });

  await page.getByText('Start date', { exact: true }).locator('..').getByRole('button').click();
  await expect(page.locator('[data-day="2026-10-05"]')).toBeVisible();
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({
    path: testInfo.outputPath('custom-range-mobile-dark.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);

  await page.keyboard.press('Escape');
  failNextMetricsRequest = true;
  await page.getByText('End date', { exact: true }).locator('..').getByRole('button').click();
  await page.locator('[data-day="2026-10-13"] button').click();
  await page.getByRole('button', { name: 'Apply date range' }).click();
  await expect(page.getByText('Could not refresh metrics')).toBeVisible();
  await expect(
    page.getByText('Outreach attempts', { exact: true }).locator('..').locator('p').last()
  ).toHaveText('—');
  await page.screenshot({ path: testInfo.outputPath('custom-range-error.png'), fullPage: true });
  expect(browserErrors).toEqual([
    'Failed to load resource: the server responded with a status of 500 (Internal Server Error)',
  ]);
});

test('shares explicit date-range application with Marketing Reports', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const reportRequests: Array<URL> = [];
  const browserErrors: Array<string> = [];

  await page.route('**/api/reports?**', async (route) => {
    const url = new URL(route.request().url());
    reportRequests.push(url);
    await route.fulfill({
      json: {
        data: [],
        pagination: { page: 1, pageSize: 500, total: 0, totalPages: 0 },
      },
    });
  });

  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/reports');
  await expect(page.getByRole('heading', { name: 'Marketing Reports', exact: true })).toBeVisible();
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    browserErrors.push(`${request.method()} ${request.url()}`);
  });

  await page.getByLabel('Choose start date').click();
  await page.locator('[data-day="2026-10-05"] button').click();
  await page.getByLabel('Choose end date').click();
  await page.locator('[data-day="2026-10-12"] button').click();
  await page.waitForTimeout(300);
  expect(
    reportRequests.some(
      (url) =>
        url.searchParams.has('periodOverlapStart') || url.searchParams.has('periodOverlapEnd')
    )
  ).toBe(false);

  await page.getByRole('button', { name: 'Apply date range' }).click();
  await expect
    .poll(() =>
      reportRequests.some(
        (url) =>
          url.searchParams.get('periodOverlapStart') === '2026-10-05' &&
          url.searchParams.get('periodOverlapEnd') === '2026-10-12'
      )
    )
    .toBe(true);
  await page.screenshot({ path: testInfo.outputPath('reports-range-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.getByLabel('Selected date October 5, 2026').click();
  await expect(page.locator('[data-day="2026-10-05"]')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('reports-range-mobile-dark.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByLabel('Choose start date')).toBeVisible();
  await expect(page.getByLabel('Choose end date')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply date range' })).toBeDisabled();
});
