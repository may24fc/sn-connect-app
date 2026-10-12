import { type BrowserContext, type Page, expect, test } from '@playwright/test';

const employeeId = process.env.E2E_UHP_EMPLOYEE_ID ?? 'e14548f9-5fc0-4b7b-8fa9-fb1e8046d97f';
const clientId = 'client-colleen';

type MockState = { status: string; wellnessEvaluations: number; clients: number };

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 90_000 });
}

function client(index: number, status: string) {
  return {
    id: index === 0 ? clientId : `client-${index}`,
    name: index === 0 ? 'Colleen Conlan' : `Prospect ${index} with a longer sample name`,
    client_type: 'Client',
    status: index === 0 ? status : 'Prospect',
    interest_state: index === 0 ? 'interested' : 'unknown',
    replied: index === 0,
    lead_owner: 'Ariana',
    source_name: 'Downline',
    source_url: null,
    email: null,
    phone: null,
    migration_review_required: false,
    updated_at: '2026-10-09T01:00:00.000Z',
  };
}

async function mockTracker(page: Page, state: MockState, options?: { metricsError?: boolean }) {
  await page.route('**/api/uhp/clients?**', async (route) => {
    await route.fulfill({
      json: {
        data: Array.from({ length: state.clients }, (_, index) => client(index, state.status)),
        sources: ['Downline'],
      },
    });
  });
  await page.route('**/api/uhp/clients/metrics?**', async (route) => {
    if (options?.metricsError) {
      await route.fulfill({ status: 500, json: { error: 'Local test error' } });
      return;
    }
    await route.fulfill({
      json: {
        data: {
          outreachAttempts: 52,
          replies: 5,
          clientsReachedOut: 50,
          repliedAfterOutreach: 5,
          reachedOutClientIds: [],
          repliedClientIds: [],
          activityReplyClientIds: [],
          responseRate: 10,
          interested: 1,
          declined: 0,
          wellnessEvaluationsScheduled: state.wellnessEvaluations,
          callsScheduled: 0,
        },
      },
    });
  });
  await page.route(`**/api/uhp/clients/${clientId}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      const update = route.request().postDataJSON();
      state.status = update.status;
      state.wellnessEvaluations = update.status === 'WE form Filled' ? 1 : 0;
      await route.fulfill({ json: { data: client(0, state.status) } });
      return;
    }
    await route.fulfill({
      json: {
        data: {
          client: client(0, state.status),
          activities: [],
          notes: [],
          attachments: [],
        },
      },
    });
  });
}

function wellnessCard(page: Page) {
  return page.getByText('Wellness evaluations', { exact: true }).locator('..').locator('p').last();
}

test.describe('Outreach wellness-evaluation card', () => {
  let adminContext: BrowserContext;
  let createdGrant = false;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);
    adminContext = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3002',
    });
    const page = await adminContext.newPage();
    await signIn(page, 'admin@example.com');
    const grantsResponse = await adminContext.request.get(
      '/api/uhp/access-grants?module=client_tracker'
    );
    expect(grantsResponse.ok()).toBeTruthy();
    const grants = (await grantsResponse.json()).data as Array<{ userId: string }>;
    if (!grants.some((grant) => grant.userId === employeeId)) {
      const response = await adminContext.request.post('/api/uhp/access-grants', {
        data: { userId: employeeId, module: 'client_tracker' },
      });
      expect(response.status()).toBe(201);
      createdGrant = true;
    }
    await page.close();
  });

  test.afterAll(async () => {
    test.setTimeout(120_000);
    if (createdGrant) {
      const response = await adminContext.request.delete('/api/uhp/access-grants', {
        data: { userId: employeeId, module: 'client_tracker' },
      });
      expect(response.ok()).toBeTruthy();
    }
    await adminContext.close();
  });

  test('admin status change updates the card without duplicate or layout errors', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const state: MockState = { status: 'Prospect', wellnessEvaluations: 0, clients: 12 };
    const errors: Array<string> = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => {
      if (request.url().includes('/api/uhp/')) {
        errors.push(`${request.method()} ${request.url()}`);
      }
    });
    await signIn(page, 'admin@example.com');
    await mockTracker(page, state);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/uhp/clients');
    await expect(wellnessCard(page)).toHaveText('0');
    await page.screenshot({
      path: testInfo.outputPath('admin-before-desktop.png'),
      fullPage: true,
    });

    await page.getByRole('row').filter({ hasText: 'Colleen Conlan' }).click();
    const status = page.getByRole('dialog').getByRole('combobox', { name: 'Status' });
    await status.click();
    await page.getByRole('option', { name: 'WE form Filled' }).click();
    await expect(wellnessCard(page)).toHaveText('1');
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
    await page.screenshot({
      path: testInfo.outputPath('admin-filled-desktop.png'),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(wellnessCard(page)).toHaveText('1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    );
    await page.screenshot({ path: testInfo.outputPath('admin-filled-mobile.png'), fullPage: true });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.screenshot({
      path: testInfo.outputPath('admin-filled-mobile-dark.png'),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });

  test('employee sees the filled-form card and the empty/error states are explicit', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const state: MockState = { status: 'WE form Filled', wellnessEvaluations: 1, clients: 1 };
    await signIn(page, 'employee@example.com');
    await mockTracker(page, state);
    await page.goto('/uhp/clients');
    await expect(wellnessCard(page)).toHaveText('1');
    await expect(page.getByRole('row').filter({ hasText: 'Colleen Conlan' })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('employee-filled-desktop.png'),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    );
    await page.screenshot({
      path: testInfo.outputPath('employee-filled-mobile.png'),
      fullPage: true,
    });

    await page.unrouteAll();
    await mockTracker(
      page,
      { status: 'Prospect', wellnessEvaluations: 0, clients: 0 },
      { metricsError: true }
    );
    await page.reload();
    await expect(page.getByText('No UHP clients match this view.')).toBeVisible();
    await expect(wellnessCard(page)).toHaveText('—');
    await page.screenshot({
      path: testInfo.outputPath('employee-empty-error.png'),
      fullPage: true,
    });
  });
});
