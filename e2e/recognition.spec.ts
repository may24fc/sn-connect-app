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
  await page.getByLabel('Colleague').click();
  await page.getByRole('option', { name: /Alex Rivera/ }).click();
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
  await expect(page.getByRole('button', { name: 'Weekly Wins' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Monthly Awards' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'History' })).toBeVisible();
  await expect(page.getByText('Recently recognized')).toBeVisible();
  await expect(page.getByText('This approved draft is locked.')).toBeVisible();
  await expect(page.getByLabel('Introduction')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reopen draft' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish to Community Highlights' })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('admin-recognition-desktop.png'),
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
});

test('HR monitors a monthly period with bounded evidence on desktop and mobile', async ({
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
  const monthlyPeriod = {
    id: '33333333-3333-4333-8333-333333333333',
    period_type: 'monthly',
    period_start: '2026-10-01',
    period_end: '2026-10-31',
    status: 'draft',
    public_intro: 'This month, we are recognizing three ways our team made a difference.',
    reviewed_at: null,
    published_at: null,
    telegram_message_id: null,
    last_error: null,
  };
  const evidence = Array.from({ length: 14 }, (_, index) => ({
    id: `project:${index + 1}`,
    source: index % 2 ? 'Projects' : 'PA',
    userId: `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`,
    category: categoryOrderForTest[index % categoryOrderForTest.length],
    summary: `Completed a verified high-impact deliverable ${index + 1} with supporting context.`,
    occurredAt: `2026-10-${String(index + 1).padStart(2, '0')}T08:00:00Z`,
    person: { name: `Employee ${index + 1}` },
    recentlyRecognized: index === 0,
  }));
  await page.route('**/api/admin/recognition', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        period: monthlyPeriod,
        selections: [],
        categories,
        evidence,
        people: evidence.map((item) => ({
          userId: item.userId,
          name: item.person.name,
          position: 'Operations',
        })),
        periods: [monthlyPeriod],
      }),
    })
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAs(page, 'admin@example.com');
  await page.goto('/admin/recognition', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByRole('button', { name: /Monthly Awards/ })).toBeVisible();
  await expect(page.getByText('No recipient selected.')).toHaveCount(3);
  await expect(page.getByText('Showing 14 of 14 evidence items')).toBeVisible();
  const evidenceRegion = page.getByTestId('evidence-scroll-region');
  await expect(evidenceRegion).toBeVisible();
  expect(
    await evidenceRegion.evaluate((element) => element.scrollHeight > element.clientHeight)
  ).toBe(true);
  await page.getByLabel('Search evidence').fill('Employee 14');
  await expect(page.getByText('Showing 1 of 14 evidence items')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('admin-recognition-monthly-desktop.png'),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: /Monthly Awards/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.screenshot({
    path: testInfo.outputPath('admin-recognition-monthly-mobile.png'),
    fullPage: true,
  });
  expect(consoleErrors).toEqual([]);
});

const categoryOrderForTest = [
  'impact_delivery',
  'accountability_timeliness',
  'collaboration_initiative',
];
