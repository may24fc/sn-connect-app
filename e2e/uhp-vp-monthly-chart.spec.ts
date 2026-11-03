import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'Asia/Manila' });

for (const email of ['super-admin@example.com', 'admin@example.com']) {
  test(`shows historical VP and tracked months without double-counting as ${email}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);
    const errors: Array<string> = [];
    let failNextLoad = false;
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        !message.text().includes('A tree hydrated but some attributes')
      ) {
        errors.push(message.text());
      }
    });
    page.on('requestfailed', (request) => {
      if (request.url().includes('/api/uhp/')) errors.push(`${request.method()} ${request.url()}`);
    });
    await page.route('**/api/uhp/volume-points/summary?**', async (route) => {
      if (failNextLoad) {
        failNextLoad = false;
        await route.fulfill({ status: 500, json: { error: 'Test monthly-chart load failure' } });
        return;
      }
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      const payload = await response.json();
      // The imported final rows come from local Supabase; only a live November order total is simulated.
      payload.data.overall = [
        ...payload.data.overall.filter(
          (row: { reportingMonth: string }) => row.reportingMonth !== '2026-11-01'
        ),
        { reportingMonth: '2026-11-01', volumePoints: 418.55, source: 'orders' },
      ];
      await route.fulfill({ response, json: payload });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.locator('#password').fill('password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 90_000 });
    await page.goto('/uhp/volume-points');
    await expect(page.getByRole('button', { name: 'Edit standards' })).toBeEnabled({
      timeout: 60_000,
    });
    await page.getByLabel('Period', { exact: true }).fill('2026-01');
    await expect(
      page.getByText('Actual VP', { exact: true }).locator('..').locator('p').last()
    ).toHaveText('1,319.1');
    await expect(page.getByText(/Actual VP includes approved final monthly totals/)).toBeVisible();
    const chart = page
      .getByRole('heading', { name: 'Monthly volume points' })
      .locator('..')
      .locator('..')
      .locator('..');
    await expect(chart.getByText('14,489.77 VP', { exact: true })).toBeVisible();
    await expect(chart.locator('.recharts-bar-rectangle path')).toHaveCount(10);
    await expect(
      chart.locator('.recharts-xAxis .recharts-cartesian-axis-tick-value').first()
    ).toHaveCSS('fill', 'rgb(79, 99, 110)');
    let rejectEntry: (() => void) | undefined;
    await page.route('**/api/uhp/volume-points/entries', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await new Promise<void>((resolve) => {
        rejectEntry = resolve;
      });
      await route.fulfill({ status: 400, json: { error: 'Test final-month rollback' } });
    });
    await page.getByRole('button', { name: 'Add entry', exact: true }).click();
    await page.getByLabel('Member', { exact: true }).fill('Browser test only');
    await page.getByLabel('Volume points', { exact: true }).fill('25');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await expect(chart.getByText('14,489.77 VP', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Actual VP', { exact: true }).locator('..').locator('p').last()
    ).toHaveText('1,319.1');
    await expect.poll(() => Boolean(rejectEntry)).toBe(true);
    rejectEntry?.();
    await expect(page.getByText('Test final-month rollback')).toBeVisible();
    await expect(page.getByText('Browser test only', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText('Test final-month rollback')).toBeHidden({ timeout: 15_000 });
    await chart.getByText('View monthly values', { exact: true }).click();
    const rows = chart.getByRole('row');
    const expected = [
      ['Jan', '1,319.10'],
      ['Feb', '2,224.32'],
      ['Mar', '1,852.22'],
      ['Apr', '1,249.93'],
      ['May', '1,355.10'],
      ['Jun', '1,231.94'],
      ['Jul', '1,348.74'],
      ['Aug', '1,993.29'],
      ['Sep', '1,496.58'],
    ];
    for (const [month, value] of expected) {
      const row = rows.filter({ hasText: `${month} 2026` });
      await expect(row).toContainText(`${value} VP`);
      await expect(row).toContainText('Final monthly total');
    }
    await expect(rows.filter({ hasText: 'Nov 2026' })).toContainText('418.55 VP');
    await expect(rows.filter({ hasText: 'Nov 2026' })).toContainText('Tracked orders');
    await expect(rows.filter({ hasText: 'Dec 2026' })).toContainText('Not reported');
    await chart.getByText('View monthly values', { exact: true }).click();
    await chart.screenshot({ path: testInfo.outputPath('monthly-vp-desktop.png') });

    await page.getByRole('combobox', { name: 'Chart year' }).click();
    await page.getByRole('option', { name: '2025', exact: true }).click();
    await expect(chart.getByText('No volume points reported for 2025.')).toBeVisible();
    await page.getByRole('combobox', { name: 'Chart year' }).click();
    await page.getByRole('option', { name: '2026', exact: true }).click();
    const bars = chart.locator('.recharts-bar-rectangle path');
    await bars.first().hover();
    await expect(chart.locator('.recharts-tooltip-wrapper')).toContainText('1,319.10 VP');
    await page.mouse.move(0, 0);

    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    );
    const scrollRegion = page.getByRole('region', { name: /Monthly volume points chart for 2026/ });
    await scrollRegion.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    expect(await scrollRegion.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await chart.screenshot({ path: testInfo.outputPath('monthly-vp-mobile.png') });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expect(
      chart.locator('.recharts-xAxis .recharts-cartesian-axis-tick-value').first()
    ).toHaveCSS('fill', 'rgb(165, 188, 196)');
    await chart.screenshot({ path: testInfo.outputPath('monthly-vp-mobile-dark.png') });
    await chart.getByText('View monthly values', { exact: true }).click();
    await expect(rows.filter({ hasText: 'Jan 2026' })).toContainText('1,319.10 VP');
    await expect(rows.filter({ hasText: 'Dec 2026' })).toContainText('Not reported');

    failNextLoad = true;
    await page.getByLabel('Period', { exact: true }).fill('2025-01');
    await expect(page.getByText('Could not load volume points for this period.')).toBeVisible();
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(chart.getByText('No volume points reported for 2025.')).toBeVisible();
    expect(errors).toEqual([
      'Failed to load resource: the server responded with a status of 400 (Bad Request)',
      'Failed to load resource: the server responded with a status of 500 (Internal Server Error)',
    ]);
  });
}
