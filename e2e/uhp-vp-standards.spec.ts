import { expect, test } from '@playwright/test';
import {
  type VolumePointMonthTarget,
  resolveVolumePointTargets,
  summarizeVolumePointCategories,
} from '../apps/web/src/lib/uhp-volume-points';

const initialTargets = [
  { category: 'personal', target_vp: 500, forecast_vp: 500 },
  { category: 'repeat_customer', target_vp: 1500, forecast_vp: 900 },
  { category: 'new_client', target_vp: 200, forecast_vp: 100 },
  { category: 'old_client', target_vp: 200, forecast_vp: 500 },
  { category: 'distributor', target_vp: 100, forecast_vp: 100 },
];

test.use({ timezoneId: 'Asia/Manila' });

for (const email of ['super-admin@example.com', 'admin@example.com']) {
  test(`edits reusable standards and month overrides as ${email}`, async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    let standards = initialTargets.map((row) => ({ ...row, effective_from: '2026-11-01' }));
    let overrides: Array<VolumePointMonthTarget> = initialTargets.map((row) => ({
      ...row,
      reporting_month: '2026-11-01',
    }));
    let failNextSave = false;
    let failNextLoad = false;
    const errors: Array<string> = [];
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
      if (request.url().includes('/api/uhp/')) {
        errors.push(`${request.method()} ${request.url()}`);
      }
    });
    await page.route('**/api/uhp/volume-points/summary?**', async (route) => {
      if (failNextLoad) {
        failNextLoad = false;
        await route.fulfill({ status: 500, json: { error: 'Test summary failure' } });
        return;
      }
      const url = new URL(route.request().url());
      const fromMonth = url.searchParams.get('fromMonth') ?? '2026-11';
      const toMonth = url.searchParams.get('toMonth') ?? fromMonth;
      const effectiveTargets = resolveVolumePointTargets(
        initialTargets.map((row) => row.category),
        fromMonth,
        toMonth,
        overrides,
        standards
      );
      const categories = summarizeVolumePointCategories(
        initialTargets.map((row) => row.category),
        [{ category: 'personal', volume_points: 100 }],
        effectiveTargets
      );
      await route.fulfill({
        json: {
          data: {
            reportingMonth: `${fromMonth}-01`,
            categories,
            standardTargets: standards,
            effectiveTargets,
            totalActualVp: 100,
            totalTargetVp: categories.reduce((sum, row) => sum + row.targetVp, 0),
            totalForecastVp: categories.reduce((sum, row) => sum + row.forecastVp, 0),
          },
        },
      });
    });
    await page.route('**/api/uhp/volume-points/entries?**', (route) =>
      route.fulfill({ json: { data: [] } })
    );
    await page.route('**/api/uhp/volume-points/targets', async (route) => {
      const body = route.request().postDataJSON() as {
        reportingMonth: string;
        scope: string;
        targets: Array<{ category: string; targetVp: number; forecastVp: number }>;
      };
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (failNextSave) {
        failNextSave = false;
        await route.fulfill({ status: 500, json: { error: 'Test save failure' } });
        return;
      }
      if (route.request().method() === 'DELETE') {
        overrides = overrides.filter((row) => row.reporting_month !== body.reportingMonth);
      } else if (body.scope === 'standards') {
        standards = body.targets.map((row) => ({
          category: row.category,
          target_vp: row.targetVp,
          forecast_vp: row.forecastVp,
          effective_from: '2026-11-01',
        }));
      } else {
        overrides = overrides.filter((row) => row.reporting_month !== body.reportingMonth);
        overrides.push(
          ...body.targets.map((row) => ({
            reporting_month: body.reportingMonth,
            category: row.category,
            target_vp: row.targetVp,
            forecast_vp: row.forecastVp,
          }))
        );
      }
      await route.fulfill({ json: { data: [] } });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.locator('#password').fill('password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 90_000 });
    await page.goto('/uhp/volume-points');

    const period = page.getByLabel('Period', { exact: true });
    const targetTotal = page
      .getByText('Target VP', { exact: true })
      .locator('..')
      .locator('p')
      .last();
    await period.fill('2026-11');
    await expect(targetTotal).toHaveText('2,500');
    await period.fill('2026-12');
    await expect(targetTotal).toHaveText('2,500');
    await expect(
      page.getByText('This month uses the standard targets and forecasts.')
    ).toBeVisible();
    await page.getByRole('button', { name: 'Edit this month' }).click();
    const personal = page.getByRole('group', { name: 'ROOF / Personal', exact: true });
    await personal.getByLabel('Target VP', { exact: true }).fill('0');
    await page.getByRole('button', { name: 'Save for this month', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Saving...', exact: true })).toBeVisible();
    await expect(period).toBeDisabled();
    await expect(
      page.getByText('Target VP', { exact: true }).last().locator('..').locator('p').last()
    ).toHaveText('2,000');
    await expect(page.getByRole('button', { name: 'Saving...', exact: true })).toHaveCount(0);
    await expect(targetTotal).toHaveText('2,000');

    await period.fill('2026-11');
    await expect(targetTotal).toHaveText('2,500');
    await period.fill('2027-01');
    await expect(targetTotal).toHaveText('2,500');
    await page.getByRole('button', { name: 'Edit standards' }).click();
    await personal.getByLabel('Target VP', { exact: true }).fill('600');
    await page.getByRole('button', { name: 'Save standards', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Saving...', exact: true })).toHaveCount(0);
    await expect(targetTotal).toHaveText('2,600');

    await period.fill('2026-12');
    await expect(targetTotal).toHaveText('2,000');
    await page.getByRole('button', { name: 'Edit this month' }).click();
    await expect(personal.getByLabel('Target VP', { exact: true })).toHaveValue('0');
    await page.getByRole('button', { name: 'Use standards for this month' }).click();
    await expect(page.getByRole('button', { name: 'Saving...', exact: true })).toHaveCount(0);
    await expect(targetTotal).toHaveText('2,600');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Edit standards' })).toBeEnabled();
    await period.fill('2026-12');
    await expect(period).toHaveValue('2026-12');
    await expect(targetTotal).toHaveText('2,600');

    await page.getByRole('button', { name: 'Edit standards' }).click();
    await personal.getByLabel('Target VP', { exact: true }).fill('700');
    failNextSave = true;
    await page.getByRole('button', { name: 'Save standards', exact: true }).click();
    await expect(page.getByText('Could not save targets', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Target VP', { exact: true }).last().locator('..').locator('p').last()
    ).toHaveText('2,600');
    await expect(personal.getByLabel('Target VP', { exact: true })).toHaveValue('700');
    await page.screenshot({
      path: testInfo.outputPath('standards-error-desktop.png'),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();

    await period.fill('2026-11');
    await expect(targetTotal).toHaveText('2,500');
    await page.getByRole('combobox', { name: 'View by' }).click();
    await page.getByRole('option', { name: 'Quarter', exact: true }).click();
    await page.getByRole('combobox', { name: 'Period', exact: true }).click();
    await page.getByRole('option', { name: /Q4 2026/ }).click();
    await expect(targetTotal).toHaveText('5,100');
    await page.getByRole('combobox', { name: 'View by' }).click();
    await page.getByRole('option', { name: 'Month', exact: true }).click();
    await period.fill('2026-12');
    await expect(targetTotal).toHaveText('2,600');
    await page.getByRole('button', { name: 'Edit standards' }).click();
    await page.screenshot({ path: testInfo.outputPath('standards-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    );
    await personal.getByLabel('Forecast VP', { exact: true }).fill('550');
    await page.getByRole('button', { name: 'Save standards', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Saving...', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Edit standards' }).click();
    await expect(personal.getByLabel('Forecast VP', { exact: true })).toHaveValue('550');
    const standardsForm = page.locator('form').filter({
      has: page.getByRole('heading', {
        name: 'Standard monthly targets and forecasts',
        exact: true,
      }),
    });
    await standardsForm.screenshot({ path: testInfo.outputPath('standards-mobile.png') });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await standardsForm.screenshot({ path: testInfo.outputPath('standards-mobile-dark.png') });
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    failNextLoad = true;
    await period.fill('2027-03');
    await expect(page.getByText('Could not load volume points for this period.')).toBeVisible();
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(targetTotal).toHaveText('2,600');
    standards = [];
    overrides = [];
    await page.reload();
    await expect(page.getByText(/No standards are saved yet/)).toBeVisible();
    await expect(targetTotal).toHaveText('0');
    await page.getByRole('button', { name: 'Edit standards' }).click();
    await expect(personal.getByLabel('Target VP', { exact: true })).toHaveValue('0');
    expect(errors).toEqual([
      'Failed to load resource: the server responded with a status of 500 (Internal Server Error)',
      'Failed to load resource: the server responded with a status of 500 (Internal Server Error)',
    ]);
  });
}
