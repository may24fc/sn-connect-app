import { expect, test } from '@playwright/test';

test('invoice dialog shows the continuous October biweekly schedule', async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(`${message.text()} (${message.location().url})`);
    }
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

  await expect(
    page.getByRole('option', { name: 'October - 1st Payout (2 Oct 2026)' })
  ).toBeVisible();
  await expect(
    page.getByRole('option', { name: 'October - 2nd Payout (16 Oct 2026)' })
  ).toBeVisible();
  await expect(
    page.getByRole('option', { name: 'October - 3rd Payout (30 Oct 2026)' })
  ).toBeVisible();
  await expect(page.getByText('November - 1st Payout (6 Nov 2026)')).toHaveCount(0);

  await page.screenshot({
    path: testInfo.outputPath('invoice-payout-schedule.png'),
    fullPage: true,
  });
  expect(browserErrors).toEqual([]);
});

test('employees can edit drafts and delete every unpaid invoice status', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(`${message.text()} (${message.location().url})`);
    }
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

  let deleted = false;
  let notes = [
    'PAYOUT_SCHEDULE:2026-10:3',
    'Payout Schedule: October - 3rd Payout (30 Oct 2026)',
    'Original note',
    'Invoice file uploaded: invoice.pdf',
  ].join('\n');
  const invoice = {
    id: 'invoice-1',
    employee_id: 'employee-1',
    invoice_number: 'INV-DRAFT-1',
    period_start: '2026-10-30',
    period_end: '2026-10-30',
    hourly_rate: null,
    hours_worked: null,
    gross_amount: 1000,
    deductions: 0,
    net_amount: 1000,
    source_currency: 'PHP',
    target_currency: 'PHP',
    exchange_rate: 1,
    converted_amount: 1000,
    status: 'draft',
    submitted_at: null,
    approved_by: null,
    approved_at: null,
    paid_at: null,
    document_id: null,
    created_at: '2026-10-30T00:00:00.000Z',
    updated_at: '2026-10-30T00:00:00.000Z',
  };
  const invoices = [
    invoice,
    { ...invoice, id: 'invoice-2', invoice_number: 'INV-SUBMITTED-1', status: 'submitted' },
    { ...invoice, id: 'invoice-3', invoice_number: 'INV-APPROVED-1', status: 'approved' },
    { ...invoice, id: 'invoice-4', invoice_number: 'INV-REJECTED-1', status: 'rejected' },
    { ...invoice, id: 'invoice-5', invoice_number: 'INV-PAID-1', status: 'paid' },
  ];

  await page.route(
    /\/api\/(?:ai\/conversations|notifications|hub-usage\/heartbeat|employees|expenses\/capabilities|(?:ats|crm|pa-tasks|revenue-forecast|marketing|ai-expenses|uhp)\/access)(?:\?.*)?$/,
    async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      let body: Record<string, unknown> = { data: { canAccess: false } };

      if (pathname === '/api/ai/conversations') body = { data: [], total: 0 };
      if (pathname === '/api/notifications') {
        body = {
          data: [],
          unreadCount: 0,
          pagination: { page: 1, pageSize: 5, total: 0, totalPages: 0 },
        };
      }
      if (pathname === '/api/employees') {
        body = {
          data: [],
          pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0 },
        };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    }
  );

  await page.route('**/api/invoices**', async (route) => {
    const request = route.request();
    if (request.method() === 'PATCH') {
      const payload = request.postDataJSON() as { notes?: string };
      notes = payload.notes ?? notes;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { ...invoice, notes } }),
      });
      return;
    }

    if (request.method() === 'DELETE') {
      deleted = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: deleted ? [] : invoices.map((item) => ({ ...item, notes })),
        pagination: { page: 1, pageSize: 25, total: deleted ? 0 : 5, totalPages: deleted ? 0 : 1 },
        stats: { submitted: 0, approved: 0, rejected: 0, paid: 0, pendingAmount: 0 },
      }),
    });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/invoice');
  await expect(page.getByText('INV-DRAFT-1')).toBeVisible();

  await page.getByRole('button', { name: 'Manage INV-DRAFT-1' }).click();
  await page.getByRole('menuitem', { name: 'Edit draft' }).click();
  await expect(page.getByRole('heading', { name: 'Edit invoice draft' })).toBeVisible();
  await page.getByLabel('Notes (optional)').fill('Updated by employee');
  await page.screenshot({
    path: testInfo.outputPath('invoice-edit-draft.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Your invoice draft changes were saved.')).toBeVisible();
  expect(notes).toContain('Updated by employee');
  expect(notes).toContain('Invoice file uploaded: invoice.pdf');

  for (const invoiceNumber of ['INV-SUBMITTED-1', 'INV-APPROVED-1', 'INV-REJECTED-1']) {
    await page.getByRole('button', { name: `Manage ${invoiceNumber}` }).click();
    await expect(page.getByRole('menuitem', { name: 'Delete invoice' })).toBeVisible();
    if (invoiceNumber === 'INV-SUBMITTED-1') {
      await page.screenshot({
        path: testInfo.outputPath('submitted-invoice-delete-action.png'),
        fullPage: true,
      });
    }
    await page.keyboard.press('Escape');
  }

  await page.getByRole('button', { name: 'Manage INV-PAID-1' }).click();
  await expect(page.getByRole('menuitem', { name: 'Delete invoice' })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Manage INV-DRAFT-1' }).click();
  await page.getByRole('menuitem', { name: 'Delete invoice' }).click();
  await expect(page.getByRole('heading', { name: 'Delete invoice?' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete invoice' }).click();
  await expect(page.getByText('INV-DRAFT-1')).toHaveCount(0);
  await expect(page.getByText('No invoices yet')).toBeVisible();
  expect(browserErrors).toEqual([]);
});
