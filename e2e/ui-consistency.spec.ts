import { type Page, expect, test } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('super-admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 90_000 });
}

async function heightOf(page: Page, selector: string): Promise<number> {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`No box for ${selector}`);
  return Math.round(box.height);
}

test('filter toolbars and header actions share one size', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  // Directory toolbar: shared search, multi-select filters and single-select filters line up.
  await page.goto('/admin/directory');
  await expect(page.getByRole('heading', { name: 'Company Directory' })).toBeVisible({
    timeout: 30_000,
  });
  const searchHeight = await heightOf(page, 'main input[placeholder^="Search by name"]');
  for (const name of ['roles', 'departments', 'divisions', 'status', 'employment type']) {
    const trigger = page
      .getByRole('button', { name: `Filter by ${name}` })
      .or(page.getByRole('combobox', { name: `Filter by ${name}` }));
    const box = await trigger.first().boundingBox();
    expect(Math.round(box?.height ?? 0), `${name} filter height`).toBe(searchHeight);
  }
  await page.screenshot({ path: testInfo.outputPath('directory-toolbar.png') });

  // Header actions use the default Button size on every page, and inputs match it.
  const directoryAction = await heightOf(page, 'main button:has-text("Export CSV")');
  expect(searchHeight, 'inputs and buttons share one control height').toBe(directoryAction);
  await page.goto('/information-hub');
  await expect(page.getByRole('heading', { name: 'Resources', exact: true })).toBeVisible({
    timeout: 30_000,
  });
  expect(await heightOf(page, 'main button:has-text("New Folder")')).toBe(directoryAction);
  // View toggles and tab lists share the control height.
  await page.goto('/admin/employee-management');
  await expect(page.getByRole('heading', { name: 'Employee Management' })).toBeVisible({
    timeout: 30_000,
  });
  expect(await heightOf(page, 'main fieldset[aria-label="View"]')).toBe(directoryAction);
  expect(await heightOf(page, 'main [role="tablist"]')).toBe(directoryAction);
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { name: 'My Tasks' })).toBeVisible({ timeout: 30_000 });
  expect(await heightOf(page, 'main button:has-text("Add Task")')).toBe(directoryAction);

  // Finance ledger uses the same compact toolbar and applies filters without a submit button.
  await page.goto('/finance/expenses');
  await expect(page.getByRole('heading', { name: 'Expenses', exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('button', { name: 'Apply filters' })).toHaveCount(0);
  const vendorSearch = page.getByRole('textbox', { name: 'Search vendor…' });
  expect(Math.round((await vendorSearch.boundingBox())?.height ?? 0)).toBe(directoryAction);
  await vendorSearch.fill('zz-no-such-vendor');
  await expect(page).toHaveURL(/[?&]q=zz-no-such-vendor/, { timeout: 15_000 });
  await expect(page.getByText('No expenses match these filters.')).toBeVisible();
  await page.getByRole('button', { name: /Clear filter/ }).click();
  await expect(page).not.toHaveURL(/[?&]q=/, { timeout: 15_000 });

  // Every page title carries the sidebar-section eyebrow.
  for (const [route, heading, eyebrow] of [
    ['/admin/directory', 'Company Directory', 'People'],
    ['/finance/expenses', 'Expenses', 'Finance'],
    ['/admin/performance', 'OKRs & KPIs', 'Work & Performance'],
    ['/admin/dashboard', null, 'Internal Management'],
  ] as const) {
    await page.goto(route);
    const title = heading
      ? page.getByRole('heading', { level: 1, name: heading, exact: true })
      : page.getByRole('heading', { level: 1 }).first();
    await expect(title).toBeVisible({ timeout: 30_000 });
    await expect(
      page.locator('main p', { hasText: new RegExp(`^${eyebrow}$`, 'i') }).first()
    ).toBeVisible();
  }

  // Shared Select inside a plain GET form still submits its value.
  await page.goto('/finance/reports');
  await page.locator('#report-view').click();
  await page.getByRole('option', { name: 'Weeks in month' }).click();
  await page.getByRole('button', { name: 'View', exact: true }).click();
  await expect(page).toHaveURL(/[?&]view=week/, { timeout: 15_000 });

  // Directory header wraps on mobile instead of overflowing.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/directory');
  await expect(page.getByRole('heading', { name: 'Company Directory' })).toBeVisible({
    timeout: 30_000,
  });
  const overflow = await page.evaluate(() => {
    const main = document.querySelector('main');
    return main ? main.scrollWidth - main.clientWidth : 0;
  });
  expect(overflow).toBeLessThanOrEqual(0);
});
