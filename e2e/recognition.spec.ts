import { expect, test } from '@playwright/test';

async function loginAs(page: Parameters<typeof test>[0]['page'], email: string) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForFunction(
    () =>
      /\/(dashboard|admin\/dashboard|super-admin\/dashboard|associate\/dashboard)/.test(
        window.location.pathname
      ),
    { timeout: 30_000 }
  );
}

const categories = {
  impact_delivery: 'Impact & Delivery',
  accountability_timeliness: 'Accountability & Timeliness',
  collaboration_initiative: 'Collaboration & Initiative',
};

test('employee submits an evidence-based colleague nomination on mobile', async ({
  page,
}, testInfo) => {
  const consoleErrors: Array<string> = [];
  page.on(
    'console',
    (message) =>
      message.type() === 'error' &&
      !message.text().includes('401 (Unauthorized)') &&
      consoleErrors.push(message.text())
  );
  let submitted = false;
  await page.route('**/api/recognition', async (route) => {
    if (route.request().method() === 'POST') {
      submitted = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'nomination-1' } }),
      });
      return;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        categories,
        nominees: [
          {
            userId: '11111111-1111-4111-8111-111111111111',
            name: 'Alex Rivera',
            position: 'Operations',
          },
        ],
        nominations: [],
      }),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page, 'employee@example.com');
  await page.goto('/recognition', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Community Recognition' })).toBeVisible();
  await page.getByLabel('Colleague').selectOption('11111111-1111-4111-8111-111111111111');
  await page.getByLabel('From').fill('2026-10-01');
  await page.getByRole('textbox', { name: 'To', exact: true }).fill('2026-10-24');
  await page
    .getByLabel('Concrete result')
    .fill('Created a clear handoff checklist that reduced missed follow-ups across the team.');
  await page.getByRole('button', { name: 'Submit nomination' }).click();
  await expect.poll(() => submitted).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('employee-recognition-mobile.png'),
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
});

test('HR reviews evidence and an approved draft on desktop', async ({ page }, testInfo) => {
  const consoleErrors: Array<string> = [];
  page.on(
    'console',
    (message) =>
      message.type() === 'error' &&
      !message.text().includes('401 (Unauthorized)') &&
      consoleErrors.push(message.text())
  );
  await page.route('**/api/admin/recognition', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        period: {
          id: '22222222-2222-4222-8222-222222222222',
          period_type: 'weekly',
          period_start: '2026-10-12',
          period_end: '2026-10-18',
          status: 'approved',
          public_intro: 'Here are this week’s Community Wins.',
        },
        selections: [
          {
            recipient_user_id: '11111111-1111-4111-8111-111111111111',
            category: null,
            public_reason: 'Delivered a cross-team handoff that removed a recurring blocker.',
            evidence_refs: ['project:1'],
          },
        ],
        categories,
        evidence: [
          {
            id: 'project:1',
            source: 'Projects',
            userId: '11111111-1111-4111-8111-111111111111',
            category: 'impact_delivery',
            summary: 'Completed an approved complex milestone.',
            person: { name: 'Alex Rivera' },
            recentlyRecognized: true,
          },
        ],
        people: [
          {
            userId: '11111111-1111-4111-8111-111111111111',
            name: 'Alex Rivera',
            position: 'Operations',
          },
        ],
        periods: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            period_type: 'weekly',
            period_start: '2026-10-12',
            period_end: '2026-10-18',
            status: 'approved',
          },
        ],
      }),
    })
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loginAs(page, 'admin@example.com');
  await page.goto('/admin/recognition', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Recognition Review' })).toBeVisible();
  await expect(page.getByText('Recently recognized')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish now' })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('admin-recognition-desktop.png'),
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
});
