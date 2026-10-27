import { expect, test } from '@playwright/test';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('associate@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 90_000 });
}

test('lets a granted associate send a responsive Volume Points update', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const requests: Array<URL> = [];
  const browserErrors: Array<string> = [];
  let manualSendRequests = 0;

  await page.route('**/api/uhp/volume-points/summary?**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    const quarterly = url.searchParams.get('fromMonth') !== url.searchParams.get('toMonth');
    await route.fulfill({
      json: {
        data: {
          reportingMonth: `${url.searchParams.get('fromMonth')}-01`,
          fromMonth: url.searchParams.get('fromMonth'),
          toMonth: url.searchParams.get('toMonth'),
          categories: [
            {
              category: 'personal',
              actualVp: quarterly ? 300 : 100,
              targetVp: quarterly ? 600 : 200,
              forecastVp: quarterly ? 450 : 150,
              targetPercent: 50,
              forecastPercent: 66.7,
            },
          ],
          totalActualVp: quarterly ? 300 : 100,
          totalTargetVp: quarterly ? 600 : 200,
          totalForecastVp: quarterly ? 450 : 150,
          overall: [],
        },
      },
    });
  });
  await page.route('**/api/uhp/volume-points/entries?**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    await route.fulfill({
      json: {
        data: [
          {
            id: 'vp-entry-1',
            member_name: 'Test Member',
            category: 'personal',
            order_date: '2026-10-12',
            order_id: 'ORDER-1',
            volume_points: 100,
            amount: 500,
            currency: 'PHP',
          },
        ],
      },
    });
  });
  await page.route('**/api/uhp/volume-points/send-telegram', async (route) => {
    manualSendRequests += 1;
    await route.fulfill({ json: { data: { accepted: true } } });
  });

  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/uhp/volume-points');
  await expect(page.getByRole('heading', { name: 'Volume Points Tracker' })).toBeVisible();
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });

  await page.getByRole('button', { name: 'Send Telegram update' }).click();
  await expect(page.getByText('Telegram update requested')).toBeVisible();
  expect(manualSendRequests).toBe(1);

  await page.getByLabel('View by').click();
  await page.getByRole('option', { name: 'Quarter' }).click();
  await expect(page.getByText('Quarterly targets and forecasts are the totals')).toBeVisible();
  await expect(page.getByText('300', { exact: true }).first()).toBeVisible();
  await expect
    .poll(() =>
      requests.some(
        (url) =>
          url.searchParams.get('fromMonth') === '2026-10' &&
          url.searchParams.get('toMonth') === '2026-12'
      )
    )
    .toBe(true);

  const entryHeaders = await page
    .getByText('Entries (1)')
    .locator('..')
    .getByRole('columnheader')
    .allTextContents();
  expect(entryHeaders.at(-1)).toBe('Actions');
  await page.screenshot({
    path: testInfo.outputPath('volume-points-quarter-desktop.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Add entry' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send Telegram update' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
  await page.screenshot({
    path: testInfo.outputPath('volume-points-quarter-mobile.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});
