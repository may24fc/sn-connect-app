import { type Page, type TestInfo, expect, test } from '@playwright/test';

const session = {
  engagementId: 'engagement-1',
  sponsorUserId: 'sponsor-1',
  purpose: 'Evaluate the clarity of the review experience',
  expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
};

let items = [
  {
    id: 'objective-1',
    kind: 'objective',
    title: 'Improve the customer onboarding experience',
    description: 'A fictional objective for product exploration.',
    status: 'in_progress',
    progress: 45,
    created_by: null,
  },
  {
    id: 'task-1',
    kind: 'task',
    title:
      'Review an intentionally long but realistic navigation improvement that still needs to fit cleanly on a narrow screen',
    description: 'This contains only synthetic data.',
    status: 'not_started',
    progress: 0,
    created_by: null,
  },
];

async function authenticateReviewer(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'reviewer-1',
        name: 'Sample Product Reviewer',
        email: 'reviewer@example.com',
        role: 'reviewer',
        accountKind: 'reviewer',
        isOnboardingComplete: true,
      })
    );
  });
}

async function mockReviewApis(page: Page) {
  await page.route('**/api/review/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/review/session') return route.fulfill({ json: { data: session } });
    if (url.pathname === '/api/review/items' && request.method() === 'GET')
      return route.fulfill({ json: { data: items } });
    if (url.pathname === '/api/review/items' && request.method() === 'POST') {
      const body = request.postDataJSON();
      const created = {
        id: 'created-1',
        ...body,
        status: 'not_started',
        progress: 0,
        created_by: 'reviewer-1',
      };
      items = [...items, created];
      return route.fulfill({ status: 201, json: { data: created } });
    }
    if (url.pathname.startsWith('/api/review/items/') && request.method() === 'PATCH') {
      const id = url.pathname.split('/').at(-1);
      const body = request.postDataJSON();
      const updated = { ...items.find((item) => item.id === id), ...body };
      items = items.map((item) => (item.id === id ? updated : item));
      return route.fulfill({ json: { data: updated } });
    }
    if (url.pathname === '/api/review/feedback' && request.method() === 'POST') {
      return route.fulfill({
        status: 201,
        json: { data: { id: 'feedback-1', ...request.postDataJSON() } },
      });
    }
    return route.fulfill({ status: 404, json: { error: 'Not mocked' } });
  });
}

async function assertNoRuntimeFailures(page: Page, run: () => Promise<void>) {
  const failures: Array<string> = [];
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(message.text());
  });
  page.on('requestfailed', (request) => failures.push(`${request.method()} ${request.url()}`));
  await run();
  expect(failures).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  items = items.slice(0, 2);
  await authenticateReviewer(page);
  await mockReviewApis(page);
});

test('reviewer completes the safe sandbox and feedback flow on desktop', async ({
  page,
}, testInfo: TestInfo) => {
  await assertNoRuntimeFailures(page, async () => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto('/review');
    await expect(
      page.getByRole('heading', { name: /Welcome, Sample Product Reviewer/ })
    ).toBeVisible();
    await expect(page.getByText('No production or employee data')).toBeVisible();

    await page.getByLabel('Try changing its status').first().selectOption('complete');
    await expect(page.getByText('Complete', { exact: true }).first()).toBeVisible();

    await page.getByLabel('Add a fictional item').fill('Clarify the weekly check-in');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Clarify the weekly check-in')).toBeVisible();

    await page
      .getByLabel('Suggestion')
      .fill('I expected the progress control to explain how completion is calculated.');
    await page.getByRole('button', { name: 'Submit feedback' }).click();
    await expect(page.getByText(/your feedback was saved/i)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('review-hub-desktop.png'), fullPage: true });
  });
});

test('review hub stays readable without horizontal overflow on mobile', async ({
  page,
}, testInfo: TestInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/review');
  await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('review-hub-mobile.png'), fullPage: true });
});

test('expired or unavailable sessions show a recoverable error state', async ({
  page,
}, testInfo: TestInfo) => {
  await page.unroute('**/api/review/**');
  await page.route('**/api/review/**', (route) =>
    route.fulfill({ status: 403, json: { error: 'Expired' } })
  );
  await page.goto('/review');
  await expect(page.getByRole('heading', { name: 'Review access unavailable' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Return to sign in' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('review-hub-expired.png'), fullPage: true });
});
