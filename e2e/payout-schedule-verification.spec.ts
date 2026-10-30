import { expect, test } from '@playwright/test';

test('invoice dialog shows the continuous October biweekly schedule', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'emp-1',
        name: 'Sample Employee',
        email: 'employee@test.com',
        role: 'employee',
        isOnboardingComplete: true,
      })
    );

    const fixedNow = new Date('2026-10-30T06:00:00.000Z').getTime();
    const NativeDate = Date;
    class FixedDate extends NativeDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        super(...(args.length === 0 ? [fixedNow] : args));
      }
      static now() {
        return fixedNow;
      }
    }
    Object.defineProperty(window, 'Date', { value: FixedDate });
  });

  await page.route('**/api/invoices**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      }),
    });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/invoice');
  await page.getByRole('button', { name: 'Submit Invoice' }).click();
  await page.getByRole('combobox').click();

  await expect(page.getByRole('option', { name: 'October - 1st Payout (2 Oct 2026)' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'October - 2nd Payout (16 Oct 2026)' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'October - 3rd Payout (30 Oct 2026)' })).toBeVisible();
  await expect(page.getByText('November - 1st Payout (6 Nov 2026)')).toHaveCount(0);

  await page.screenshot({
    path: testInfo.outputPath('invoice-payout-schedule.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});
