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
  const maintenance = [
    {
      id: 'm1',
      property_id: propertyId,
      job_date: '2026-10-02',
      description: 'Plumbing',
      contractor: 'Fix-It',
      cost_aud: 180,
      invoice_reference: 'INV-1',
      status: 'paid',
      created_by: 'user',
      created_at: '2026-10-02T00:00:00Z',
    },
    {
      id: 'm2',
      property_id: propertyId,
      job_date: '2026-10-03',
      description: 'Gutter clean',
      contractor: null,
      cost_aud: 220,
      invoice_reference: null,
      status: 'scheduled',
      created_by: 'user',
      created_at: '2026-10-03T00:00:00Z',
    },
  ];
  const mutations: Array<Record<string, unknown>> = [];
  await page.route('**/api/finance/properties?month=2026-10', async (route) => {
    await route.fulfill({
      json: {
        data: {
          properties: [currentProperty],
          payments: [],
          maintenance,
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
    if (payload.kind === 'details') {
      currentProperty = {
        ...currentProperty,
        property_code: payload.propertyCode as string,
        agent_name: payload.agentName as null,
        receiving_account_label: payload.receivingAccountLabel as null,
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
  const expectedRentDialog = page.getByRole('dialog', { name: 'Expected rent for October 2026' });
  await expect(expectedRentDialog).toBeVisible();
  await page.getByLabel('Expected rent for October 2026 (AUD)').fill('2700');
  await page.getByLabel('Calculation note (optional)').fill('2 weeks × $650 + 2 weeks × $700');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByText('Expected rent saved for October 2026')).toBeVisible();
  await expect(page.getByText(/Manual override · 2 weeks/)).toBeVisible();

  await page.getByRole('button', { name: 'Change terms from October 2026' }).click();
  await expect(page.getByRole('dialog', { name: 'Change terms from October 2026' })).toBeVisible();
  await page.getByLabel('Rent amount (AUD)').fill('700');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(
    page.getByText('Property terms saved from October 2026; earlier months are unchanged')
  ).toBeVisible();

  await page.getByRole('button', { name: 'Edit details' }).click();
  const detailsDialog = page.getByRole('dialog', { name: 'Edit property details' });
  await detailsDialog.getByLabel('Property ID').fill('P001');
  await detailsDialog.getByLabel('Agent (optional)').fill('Ray White');
  await detailsDialog.getByLabel('Rent paid into (optional)').fill('CBA rent account');
  await detailsDialog.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByText('Property details saved')).toBeVisible();
  await expect(page.getByText('Agent: Ray White · Rent paid into: CBA rent account')).toBeVisible();
  expect(mutations).toEqual([
    expect.objectContaining({ kind: 'expected_rent', expectedRentAud: 2700 }),
    expect.objectContaining({ kind: 'terms', effectiveMonth: '2026-10', weeklyRentAud: 700 }),
    expect.objectContaining({ kind: 'details', propertyCode: 'P001', agentName: 'Ray White' }),
  ]);

  await page.getByRole('tab', { name: 'Maintenance' }).click();
  await expect(page.getByRole('rowheader', { name: 'Total · 2 jobs' })).toBeVisible();
  await expect(page.locator('tfoot')).toContainText('$400.00');
  await expect(page.locator('tfoot')).toContainText('1 without invoice reference');

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
  const catalogUrl = (url: URL) =>
    url.pathname === '/api/finance/catalog' && url.searchParams.has('month');
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

test('saved snapshot opens a readable report instead of raw data', async ({ page }, testInfo) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
  ).toBeVisible({ timeout: 45_000 });
  const consoleErrors: Array<string> = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const snapshotId = '22222222-2222-4222-8222-222222222222';
  const snapshot = {
    id: snapshotId,
    status: 'draft',
    exception_count: 2,
    created_at: '2026-10-28T03:15:00Z',
    report_month: '2026-10-01',
    report_data: {
      reportMonthLabel: 'October 2026',
      generatedAt: '2026-10-28T03:15:00Z',
      summary: [
        { metric: 'Total Spend (AUD)', currentMonth: 4035.1, previousMonth: 3500, momPercentChange: 15.29 },
        { metric: 'Average Spend Per Entry', currentMonth: 576.44, previousMonth: 500, momPercentChange: 15.29 },
      ],
      categoryBreakdown: [
        { category: 'software', spendAud: 3000, percentOfTotal: 74.35 },
        { category: 'travel', spendAud: 1035.1, percentOfTotal: 25.65 },
      ],
      previousCategoryBreakdown: [{ category: 'software', spendAud: 3500, percentOfTotal: 100 }],
      departmentBreakdown: [{ departmentName: 'Operations', spendAud: 4035.1, momVariationPercent: 15.29 }],
      previousDepartmentBreakdown: [{ departmentName: 'Operations', spendAud: 3500 }],
      pipelineStatus: { autoApproved: 1, awaitingAssociateReview: 2, approved: 4, draftExtracted: 0 },
      anomalies: [
        {
          vendorName: 'Sample Airline',
          transactionDate: '2026-10-10',
          totalAmountAud: 820.5,
          varianceAmountAud: 20.5,
          reason: 'variance_flagged',
        },
      ],
      unknownPayments: [
        { vendorName: 'Office supplier', transactionDate: '2026-10-12', currency: 'AUD', amount: 25 },
      ],
      paymentStatusCounts: { unknown: 1, unpaid: 2, confirmed: 4 },
      subscriptionsAsOfSnapshot: [],
      wiseImportRowsForMonth: [],
    },
  };
  await page.route(
    (url) => url.pathname === '/api/finance/reports' && url.searchParams.get('month') === '2026-10',
    async (route) => {
      if (new URL(route.request().url()).searchParams.get('snapshot') === snapshotId) {
        await route.fulfill({ json: { data: snapshot } });
        return;
      }
      await route.fulfill({
        json: {
          data: {
            report: { anomalies: [], unknownPayments: [], paymentStatusCounts: { unknown: 0, unpaid: 0, confirmed: 0 } },
            snapshots: [
              { id: snapshotId, status: 'draft', exception_count: 2, created_at: snapshot.created_at },
            ],
          },
        },
      });
    }
  );

  for (const viewport of [
    { width: 1440, height: 900, name: 'desktop' },
    { width: 390, height: 844, name: 'mobile' },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/finance/reports?month=2026-10');
    await page.getByRole('button', { name: 'View saved snapshot' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Draft snapshot · October 2026' })).toBeVisible();
    await expect(
      dialog.getByRole('region', { name: 'Snapshot totals' }).getByText('$4,035.10')
    ).toBeVisible();
    await expect(dialog.getByRole('cell', { name: 'Software & Subscriptions' })).toBeVisible();
    await expect(dialog.getByText('Amount differs')).toBeVisible();
    await expect(dialog.getByRole('cell', { name: '10 Oct 2026' })).toBeVisible();
    await expect(dialog.getByText(/report_data|reportMonthLabel|generatedAt/)).toHaveCount(0);
    const dialogBox = await dialog.boundingBox();
    expect((dialogBox?.x ?? 0) + (dialogBox?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: testInfo.outputPath(`snapshot-${viewport.name}.png`) });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  }
  expect(consoleErrors).toEqual([]);
});

for (const account of [
  { email: 'admin@example.com', desk: '/admin/expenses' },
  { email: 'accounting@example.com', desk: '/expenses/desk' },
] as const) {
  test(`amount differences open the ${account.desk} review tab`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(account.email);
    await page.locator('#password').fill('password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
    ).toBeVisible({ timeout: 90_000 });
    const difference = {
      id: '33333333-3333-4333-8333-333333333333',
      vendor_name: 'Sample Airline',
      transaction_date: '2026-10-10',
      total_amount: 820.5,
      currency: 'AUD',
    };
    await page.route(
      (url) => url.pathname === '/api/expenses' && url.searchParams.get('matchStatus') !== null,
      async (route) => {
        const status = new URL(route.request().url()).searchParams.get('matchStatus');
        await route.fulfill({ json: { data: status === 'variance_flagged' ? [difference] : [] } });
      }
    );
    await page.route('**/api/finance/review', async (route) => route.fulfill({ json: { data: [] } }));
    await page.goto('/finance/expenses?tab=review');
    const link = page.getByRole('link', { name: 'Review difference' });
    await expect(link).toHaveAttribute('href', `${account.desk}?tab=exceptions`);
    await expect(page.getByText('10 Oct 2026 · Amount differs')).toBeVisible();
    await page.unroute((url) => url.pathname === '/api/expenses' && url.searchParams.get('matchStatus') !== null);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${account.desk}\\?tab=exceptions$`), {
      timeout: 60_000,
    });
    await expect(page.getByRole('tab', { name: /Amount differences/ })).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 45_000 }
    );
  });
}

test('invoice register shows readable, collapsed pay periods', async ({ page }, testInfo) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
  ).toBeVisible({ timeout: 45_000 });
  const periods = [
    ['2026-10-16', '2026-10-16'],
    ['2026-10-01', '2026-10-15'],
    ['2026-10-16', '2026-11-03'],
    ['2026-12-28', '2027-01-03'],
  ];
  await page.route('**/api/invoices?page=1&pageSize=25', async (route) => {
    await route.fulfill({
      json: {
        data: periods.map(([start, end], index) => ({
          id: `invoice-${index}`,
          employee_id: 'employee-1',
          invoice_number: `INV-E2E-${index + 1}`,
          period_start: start,
          period_end: end,
          net_amount: 1000,
          source_currency: 'PHP',
          status: 'submitted',
          employees: { first_name: 'Test', last_name: 'Staff' },
        })),
        pagination: { total: periods.length, totalPages: 1 },
      },
    });
  });
  await page.goto('/finance/staff-payments');
  const periodCells = page.locator('table tbody tr td:nth-child(3)');
  await expect(periodCells).toHaveText([
    '16 Oct 2026',
    '1–15 Oct 2026',
    /^16 Oct\s–\s3 Nov 2026$/,
    /^28 Dec 2026\s–\s3 Jan 2027$/,
  ]);
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await periodCells.first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`invoice-periods-${viewport.name}.png`),
    });
  }
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
