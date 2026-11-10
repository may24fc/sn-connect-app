import { type Page, expect, test } from '@playwright/test';

const clientId = 'client-call-test';
test.use({ timezoneId: 'Asia/Manila' });

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('super-admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 90_000 });
}

test('Outreach result filters and row toggles work on desktop and mobile', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  let called = false;
  let weForm = false;
  let weCall = false;
  const clientRequests: Array<URL> = [];
  const errors: Array<string> = [];
  const client = () => ({
    id: clientId,
    name: 'Call Test Client',
    client_type: 'Client',
    status: 'Prospect',
    interest_state: 'unknown',
    interest_state_at: null,
    replied: false,
    replied_at: null,
    called,
    we_form: weForm,
    we_form_at: weForm ? '2026-11-08T01:00:00.000Z' : null,
    we_call: weCall,
    lead_owner: 'Ariana',
    source_name: 'Downline',
    source_url: null,
    email: null,
    phone: null,
    migration_review_required: false,
    updated_at: '2026-10-23T01:00:00.000Z',
  });
  const filteredClients = () => [
    client(),
    {
      ...client(),
      id: 'client-replied-test',
      name: 'Replied Client',
      replied: true,
      replied_at: '2026-11-05T01:00:00.000Z',
    },
    {
      ...client(),
      id: 'client-declined-test',
      name: 'Declined Client',
      interest_state: 'declined',
      interest_state_at: '2026-11-06T01:00:00.000Z',
    },
    {
      ...client(),
      id: 'client-we-form-test',
      name: 'WE Form Client',
      we_form: true,
      we_form_at: '2026-10-20T01:00:00.000Z',
    },
  ];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const text = message.text();
    // The local shell has an established dev-only Radix generated-id hydration warning.
    if (message.type() === 'error' && !text.includes('A tree hydrated but some attributes')) {
      errors.push(text);
    }
  });
  page.on('requestfailed', (request) => {
    if (request.url().includes('/api/uhp/')) errors.push(`${request.method()} ${request.url()}`);
  });
  await page.route('**/api/uhp/clients?**', (route) => {
    const url = new URL(route.request().url());
    clientRequests.push(url);
    const filter = url.searchParams.get('outreachResult');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const inRange = (value: string | null | undefined) =>
      !from || !to || Boolean(value && value >= from && value <= to);
    const rows = filteredClients();
    const counts = {
      replied: rows.filter((row) => row.replied && inRange(row.replied_at)).length,
      declined: rows.filter(
        (row) => row.interest_state === 'declined' && inRange(row.interest_state_at)
      ).length,
      weForm: rows.filter((row) => row.we_form && inRange(row.we_form_at)).length,
    };
    const data = rows.filter((row) => {
      if (filter === 'replied') return row.replied && inRange(row.replied_at);
      if (filter === 'declined') {
        return row.interest_state === 'declined' && inRange(row.interest_state_at);
      }
      if (filter === 'we-form') return row.we_form && inRange(row.we_form_at);
      if (from && to) {
        return (
          (row.replied && inRange(row.replied_at)) ||
          (row.interest_state === 'declined' && inRange(row.interest_state_at)) ||
          (row.we_form && inRange(row.we_form_at))
        );
      }
      return true;
    });
    return route.fulfill({ json: { data, filterCounts: counts, sources: ['Downline'] } });
  });
  await page.route('**/api/uhp/clients/metrics?**', (route) =>
    route.fulfill({
      json: {
        data: {
          outreachAttempts: 1,
          replies: 0,
          clientsReachedOut: 1,
          repliedAfterOutreach: 0,
          reachedOutClientIds: [clientId],
          repliedClientIds: [],
          activityReplyClientIds: [],
          responseRate: 0,
          interested: 0,
          declined: 0,
          wellnessEvaluationsScheduled: 0,
          callsScheduled: called ? 1 : 0,
        },
      },
    })
  );
  await page.route(`**/api/uhp/clients/${clientId}`, async (route) => {
    expect(route.request().method()).toBe('PATCH');
    const body = route.request().postDataJSON();
    if ('called' in body) {
      expect(body).toEqual({ called: true });
      called = true;
    } else if ('weForm' in body) {
      expect(body).toEqual({ weForm: true });
      weForm = true;
    } else {
      expect(body).toEqual({ weCall: true });
      weCall = true;
    }
    await route.fulfill({ json: { data: client() } });
  });

  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/uhp/clients');

  const outreachResultFilter = page.getByLabel('Filter by outreach result');
  await expect(page.getByText('Replied: 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Declined: 1', { exact: true })).toBeVisible();
  await expect(page.getByText('WE Form: 1', { exact: true })).toBeVisible();
  await outreachResultFilter.click();
  await page.getByRole('option', { name: 'Replied (1)', exact: true }).click();
  await expect(page.getByText('Replied Client', { exact: true })).toBeVisible();
  await expect(page.getByText('Call Test Client', { exact: true })).toHaveCount(0);

  await outreachResultFilter.click();
  await page.getByRole('option', { name: 'Declined (1)', exact: true }).click();
  await expect(page.getByText('Declined Client', { exact: true })).toBeVisible();
  await expect(page.getByText('Replied Client', { exact: true })).toHaveCount(0);

  await outreachResultFilter.click();
  await page.getByRole('option', { name: 'Filled WE Form (1)', exact: true }).click();
  await expect(page.getByText('WE Form Client', { exact: true })).toBeVisible();
  await expect(page.getByText('Declined Client', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Clear filter', exact: true }).click();
  await expect(page.getByText('Call Test Client', { exact: true })).toBeVisible();

  await page.getByText('Start date', { exact: true }).locator('..').getByRole('button').click();
  await page.locator('[data-day="2026-11-01"] button').click();
  await page.getByText('End date', { exact: true }).locator('..').getByRole('button').click();
  await page.locator('[data-day="2026-11-09"] button').click();
  await page.getByRole('button', { name: 'Apply date range' }).click();
  await expect(page.getByText('Replied: 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Declined: 1', { exact: true })).toBeVisible();
  await expect(page.getByText('WE Form: 0', { exact: true })).toBeVisible();
  await expect(page.getByText('WE Form Client', { exact: true })).toHaveCount(0);
  await expect
    .poll(() => clientRequests.at(-1)?.searchParams.get('from'))
    .toBe('2026-10-31T16:00:00.000Z');
  expect(clientRequests.at(-1)?.searchParams.get('to')).toBe('2026-11-09T15:59:59.999Z');

  await page.getByRole('button', { name: 'Clear filter', exact: true }).click();
  await expect(page.getByText('WE Form Client', { exact: true })).toBeVisible();

  const toggle = page.getByRole('checkbox', { name: 'Call: Call Test Client', exact: true });
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(toggle).toBeChecked();
  await expect(
    page.getByText('Calls scheduled', { exact: true }).locator('..').locator('p').last()
  ).toHaveText('1');
  const headers = await page.locator('thead th').allTextContents();
  const interestIndex = headers.indexOf('Interest');
  expect(headers.slice(interestIndex, interestIndex + 3)).toEqual([
    'Interest',
    'WE Form',
    'WE Call',
  ]);
  const weFormToggle = page.getByRole('checkbox', { name: 'WE Form: Call Test Client' });
  const weCallToggle = page.getByRole('checkbox', { name: 'WE Call: Call Test Client' });
  await expect(weFormToggle).not.toBeChecked();
  await weFormToggle.check();
  await expect(weFormToggle).toBeChecked();
  await expect(weCallToggle).not.toBeChecked();
  await weCallToggle.check();
  await expect(weCallToggle).toBeChecked();
  await page.screenshot({ path: testInfo.outputPath('call-column-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
  await toggle.scrollIntoViewIfNeeded();
  await expect(toggle).toBeChecked();
  await expect(weFormToggle).toBeChecked();
  await expect(weCallToggle).toBeChecked();
  await weCallToggle.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('call-column-mobile.png') });
  expect(errors).toEqual([]);
});
