import { type Page, expect, test } from '@playwright/test';

const clientId = 'client-call-test';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('super-admin@example.com');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 90_000 });
}

test('Call, WE Form, and WE Call columns update on desktop and mobile', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  let called = false;
  let weForm = false;
  let weCall = false;
  const errors: Array<string> = [];
  const client = () => ({
    id: clientId,
    name: 'Call Test Client',
    client_type: 'Client',
    status: 'Prospect',
    interest_state: 'unknown',
    replied: false,
    called,
    we_form: weForm,
    we_call: weCall,
    lead_owner: 'Ariana',
    source_name: 'Downline',
    source_url: null,
    email: null,
    phone: null,
    migration_review_required: false,
    updated_at: '2026-10-23T01:00:00.000Z',
  });

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
  await page.route('**/api/uhp/clients?**', (route) =>
    route.fulfill({ json: { data: [client()], sources: ['Downline'] } })
  );
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
