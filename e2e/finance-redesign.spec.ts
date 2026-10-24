import { expect, test } from '@playwright/test';

test.setTimeout(240_000);

const accounts = [
  { name: 'admin', email: 'admin@example.com' },
  { name: 'super-admin', email: 'super-admin@example.com' },
  { name: 'accounting', email: 'accounting@example.com' },
] as const;

async function expectPageToUseAppShellSpacing(page: import('@playwright/test').Page) {
  const mainRegions = page.locator('main');
  await expect(mainRegions).toHaveCount(2);
  const shell = mainRegions.first();
  const pageContent = mainRegions.nth(1);
  const [shellBox, pageBox, shellPadding] = await Promise.all([
    shell.boundingBox(),
    pageContent.boundingBox(),
    shell.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        left: Number.parseFloat(style.paddingLeft),
        right: Number.parseFloat(style.paddingRight),
      };
    }),
  ]);
  expect(shellBox).not.toBeNull();
  expect(pageBox).not.toBeNull();
  expect(pageBox?.x).toBeCloseTo((shellBox?.x ?? 0) + shellPadding.left, 0);
  expect(pageBox?.width).toBeCloseTo(
    (shellBox?.width ?? 0) - shellPadding.left - shellPadding.right,
    0
  );
}

for (const account of accounts) {
  test(`Finance and SFO screens render for ${account.name}`, async ({ page }, testInfo) => {
    testInfo.setTimeout(480_000);
    const consoleErrors: Array<string> = [];
    const failedRequests: Array<string> = [];
    page.on('pageerror', (error) => consoleErrors.push(`${page.url()}: ${error.message}`));
    page.on('requestfailed', (request) => {
      const reason = request.failure()?.errorText ?? '';
      if (!/ERR_ABORTED|NS_BINDING_ABORTED/.test(reason))
        failedRequests.push(`${request.url()} (${reason})`);
    });
    page.on('response', (response) => {
      if (
        response.status() >= 400 &&
        response.url().startsWith(testInfo.project.use.baseURL as string)
      )
        failedRequests.push(`${response.url()} (HTTP ${response.status()})`);
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill(account.email);
    await page.locator('#password').fill('password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
    ).toBeVisible({
      timeout: 45_000,
    });
    const routes = [
      '/finance?month=2026-10',
      '/finance/expenses?tab=subscriptions',
      '/property/properties',
      '/finance/staff-payments',
      '/finance/reports?month=2026-10&view=quarter',
      ...(account.name === 'accounting' ? [] : ['/sfo/performance']),
    ];
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 45_000 });
      if (route === '/property/properties')
        await expect(page.getByText(/Loading property register/)).toHaveCount(0, {
          timeout: 45_000,
        });
      if (route.startsWith('/finance/reports'))
        await expect(page.getByText(/Loading report checks/)).toHaveCount(0, { timeout: 45_000 });
      if (route === '/finance/staff-payments')
        await expect(page.getByText(/Loading approved invoices/)).toHaveCount(0, {
          timeout: 45_000,
        });
      if (route === '/sfo/performance')
        await expect(page.getByText(/Loading ad spend data/)).toHaveCount(0, { timeout: 45_000 });
      if (route.startsWith('/finance/expenses'))
        await expect(page.locator('[aria-label="Subscription summary"]')).not.toContainText(
          /\u2014/,
          { timeout: 45_000 }
        );
      if (route === '/property/properties') {
        await expect(
          page.getByRole('button', { name: 'Current workspace: Property Development' })
        ).toBeVisible();
      }
      if (route.startsWith('/finance/reports')) {
        await expect(page.getByText('Quarterly recorded spend')).toBeVisible();
        await expect(page.getByText(/Finalization policy pending/)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Mark final' })).toBeDisabled();
      }
      if (route === '/finance/staff-payments') {
        if (account.name === 'accounting') {
          await expect(
            page.getByText(/Wise batch handling are restricted to administrators/)
          ).toBeVisible();
        } else {
          await expect(page.getByText('External file test pending')).toBeVisible();
          await page.getByRole('button', { name: 'Hide amounts' }).click();
          await expect(page.getByRole('button', { name: 'Show amounts' })).toBeVisible();
        }
      }
      await expect(page.locator('body')).not.toContainText('Internal Server Error');
      await page.locator('main').first().evaluate((element) => element.scrollTo({ top: 0 }));
      await expectPageToUseAppShellSpacing(page);
      await page.screenshot({
        path: testInfo.outputPath(
          `${account.name}-${route.split('/')[2]?.split('?')[0] ?? 'page'}-desktop.png`
        ),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator('body')).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(
          `${account.name}-${route.split('/')[2]?.split('?')[0] ?? 'page'}-mobile.png`
        ),
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        395
      );
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    if (account.name === 'super-admin') {
      await page.goto('/finance/expenses?tab=review', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Policy pending')).toBeVisible({ timeout: 45_000 });
    }

    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}

test('accounting sees Finance navigation', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('accounting@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
  ).toBeVisible({ timeout: 90_000 });

  await expect(page.getByRole('button', { name: 'Overview', exact: true })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByRole('button', { name: 'Expenses', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Staff Payments', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reports', exact: true })).toBeVisible();
});

test('leadership resolves a Wise exception and sees unknown confirmations listed', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
  ).toBeVisible({ timeout: 45_000 });

  let resolved = false;
  const exceptionId = '11111111-1111-4111-8111-111111111111';
  await page.route('**/api/finance/wise-batches', async (route) => {
    await route.fulfill({
      json: {
        data: {
          ready: [],
          batches: [],
          canResolveExceptions: true,
          unresolvedExceptions: resolved
            ? []
            : [
                {
                  id: exceptionId,
                  batch_id: 'batch-1',
                  payment_reference: 'ref-1',
                  result: 'failed',
                  detail: 'Needs review',
                  imported_at: '2026-10-12T00:00:00Z',
                },
              ],
        },
      },
    });
  });
  await page.route(
    `**/api/finance/wise-batches/import-exceptions/${exceptionId}`,
    async (route) => {
      resolved = true;
      await route.fulfill({ json: { data: { id: exceptionId } } });
    }
  );
  await page.goto('/finance/staff-payments');
  await expect(page.getByText('Wise import exceptions')).toBeVisible();
  await page
    .getByRole('textbox', { name: `Resolution note for ${exceptionId}` })
    .fill('Verified outside the batch');
  await page.getByRole('button', { name: 'Resolve exception' }).click();
  await expect(page.getByText('Wise import exceptions')).toHaveCount(0);

  await page.route('**/api/finance/reports?month=2026-10', async (route) => {
    await route.fulfill({
      json: {
        data: {
          report: {
            anomalies: [],
            unknownPayments: [
              {
                vendorName: 'Office supplier',
                transactionDate: '2026-10-10',
                currency: 'AUD',
                amount: 25,
              },
            ],
            paymentStatusCounts: { unknown: 1, unpaid: 0, confirmed: 0 },
            subscriptionsAsOfSnapshot: [],
            wiseImportRowsForMonth: [],
          },
          snapshots: [],
        },
      },
    });
  });
  await page.goto('/finance/reports?month=2026-10');
  await expect(page.getByText('Office supplier')).toBeVisible();
  await expect(
    page.getByText(/1 direct payments listed under the current safeguard; final policy is pending/)
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark final' })).toBeDisabled();
});

test('monthly expected rent and effective-month terms stay server-confirmed', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(480_000);
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
  ).toBeVisible({ timeout: 45_000 });

  const propertyId = '123e4567-e89b-42d3-a456-426614174000';
  const property = {
    id: propertyId,
    property_code: 'TEST-001',
    name: 'Weekly rent test property',
    property_type: 'Residential',
    agent_name: null,
    receiving_account_label: null,
    tenant_name: 'Test tenant',
    occupancy: 'occupied',
    weekly_rent_aud: 650,
    rent_cadence: 'weekly' as const,
    rent_amount_aud: 650,
    due_day: 5,
    created_by: 'user',
    created_at: '2026-01-01T00:00:00Z',
    term_effective_month: '2026-01-01',
    default_expected_rent_aud: 2816.67,
    expected_rent_aud: 2816.67,
    expected_rent_note: null,
    has_expected_rent_override: false,
  };
  let currentProperty = { ...property };
  const mutations: Array<Record<string, unknown>> = [];
  await page.route('**/api/finance/properties?month=2026-10', async (route) => {
    await route.fulfill({
      json: {
        data: {
          properties: [currentProperty],
          payments: [],
          maintenance: [],
          statusEvents: [],
        },
      },
    });
  });
  await page.route('**/api/finance/properties', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fulfill({
        json: {
          data: {
            properties: [currentProperty],
            payments: [],
            maintenance: [],
            statusEvents: [],
          },
        },
      });
      return;
    }
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    mutations.push(payload);
    if (payload.kind === 'expected_rent') {
      currentProperty = {
        ...currentProperty,
        expected_rent_aud: payload.expectedRentAud as number,
        expected_rent_note: payload.calculationNote as string,
        has_expected_rent_override: true,
      };
    }
    if (payload.kind === 'terms') {
      currentProperty = {
        ...currentProperty,
        weekly_rent_aud: payload.weeklyRentAud as number,
        rent_amount_aud: payload.rentAmountAud as number,
        term_effective_month: '2026-10-01',
      };
    }
    await route.fulfill({ status: 200, json: { data: payload } });
  });

  await page.goto('/property/properties?month=2026-10', {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });
  await expect(page.getByText(/Loading property register/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit expected rent' }).click();
  await page.getByLabel('Expected rent for 2026-10 (AUD)').fill('2700');
  await page.getByLabel('Calculation note (optional)').fill('2 weeks × $650 + 2 weeks × $700');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByText('Expected rent saved for 2026-10')).toBeVisible();
  await expect(page.getByText(/Manual override · 2 weeks/)).toBeVisible();

  await page.getByRole('button', { name: 'Change terms from 2026-10' }).click();
  await page.getByLabel('Rent amount (AUD)').fill('700');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(
    page.getByText('Property terms saved from 2026-10; earlier months are unchanged')
  ).toBeVisible();
  expect(mutations).toEqual([
    expect.objectContaining({ kind: 'expected_rent', expectedRentAud: 2700 }),
    expect.objectContaining({ kind: 'terms', effectiveMonth: '2026-10', weeklyRentAud: 700 }),
  ]);

  await page.screenshot({
    path: testInfo.outputPath('property-monthly-expected-rent-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(395);
  await page.screenshot({
    path: testInfo.outputPath('property-monthly-expected-rent-mobile.png'),
    fullPage: true,
  });
});

test('subscription register handles long rows and load errors on mobile', async ({
  page,
}, testInfo) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
  ).toBeVisible({ timeout: 45_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  const catalogUrl = '**/api/finance/catalog?month=2026-10-01';
  await page.route(catalogUrl, async (route) => {
    await route.fulfill({
      json: {
        data: {
          categories: [{ code: 'software', name: 'Software', example: '', sort_order: 3 }],
          budgets: [],
          subscriptions: Array.from({ length: 25 }, (_, index) => ({
            id: `sub-${index}`,
            vendor_name: `Long subscription vendor name ${index} with details`,
            category_code: 'software',
            payment_source: 'company_card',
            monthly_amount_aud: 25,
            billing_amount: 25,
            billing_currency: 'AUD',
            seats: 3,
            last_charged: null,
            next_renewal: null,
            active: true,
          })),
        },
      },
    });
  });
  await page.goto('/finance/expenses?tab=subscriptions');
  await expect(page.getByText('Long subscription vendor name 24 with details')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add optional limits' })).toBeVisible();
  await expect(page.getByLabel(/monthly budget/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Add optional limits' }).click();
  await expect(page.getByLabel('Software monthly budget')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(395);
  await page.screenshot({
    path: testInfo.outputPath('subscriptions-long-mobile.png'),
    fullPage: true,
  });
  await page.unroute(catalogUrl);
  await page.route(catalogUrl, async (route) =>
    route.fulfill({ status: 500, json: { error: 'Temporary local test error' } })
  );
  await page.reload();
  await expect(page.getByText('Could not load subscriptions and budgets')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('subscriptions-error-mobile.png'),
    fullPage: true,
  });
});

test('legacy detail panels fetch only after expansion', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
  ).toBeVisible({ timeout: 45_000 });
  const requested: Array<string> = [];
  page.on('request', (request) => requested.push(request.url()));
  await page.goto('/finance/staff-payments');
  await expect(page.getByRole('button', { name: 'Hide amounts' })).toBeVisible();
  expect(requested.some((url) => url.includes('/api/invoices?page=1&pageSize=1000'))).toBe(false);
  const invoiceResponse = page.waitForResponse((response) =>
    response.url().includes('/api/invoices?page=1&pageSize=1000')
  );
  await page.getByText('Open employee invoice administration').click();
  expect((await invoiceResponse).status()).toBe(200);

  await page.goto('/finance/reports?month=2026-10');
  expect(requested.some((url) => url.includes('/api/departments?page=1&pageSize=200'))).toBe(false);
  const departmentResponse = page.waitForResponse((response) =>
    response.url().includes('/api/departments?page=1&pageSize=200')
  );
  await page.getByText('Open detailed expense analytics').click();
  expect((await departmentResponse).status()).toBe(200);
});

test('Finance and Properties remain readable in dark mode', async ({ page }, testInfo) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
  ).toBeVisible({ timeout: 45_000 });
  await page.evaluate(() => localStorage.setItem('theme', 'dark'));
  for (const route of [
    '/finance/reports?month=2026-10',
    '/property/properties',
    '/sfo/performance',
  ]) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (route.startsWith('/finance/reports'))
      await expect(page.getByText(/Loading report checks/)).toHaveCount(0, { timeout: 45_000 });
    else if (route.startsWith('/property'))
      await expect(page.getByText(/Loading property register/)).toHaveCount(0, { timeout: 45_000 });
    else await expect(page.getByText(/Loading ad spend data/)).toHaveCount(0, { timeout: 45_000 });
    await page.screenshot({
      path: testInfo.outputPath(
        `dark-${route.startsWith('/property') ? 'properties' : route.startsWith('/sfo') ? 'sfo' : 'reports'}.png`
      ),
      fullPage: true,
    });
  }
});
