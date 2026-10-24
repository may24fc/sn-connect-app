import { type Page, expect, test } from '@playwright/test';

/**
 * Ask AI about 5% Reflections. The insights API is mocked in memory so the
 * panel's full flow (stream → persist → refetch) runs without OpenAI.
 */

type Conversation = {
  id: string;
  title: string;
  evaluationKind: 'five_percent';
  periodKey: string;
  monthsBack: number;
  lastMessageAt: string;
  createdAt: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'complete' | 'error' | 'aborted';
  contextSnapshotHash: string | null;
  createdAt: string;
};

type MockState = {
  conversations: Array<Conversation>;
  messages: Record<string, Array<Message>>;
  stale: Set<string>;
  chatStatus: number;
  deleteStatus: number;
  chatBodies: Array<Record<string, unknown>>;
};

// Cold dev-server compiles of the admin route can exceed the default timeout.
test.describe.configure({ timeout: 120_000 });

const MONTH_KEY = new Date().toISOString().slice(0, 7);
const ANSWER = '**Cat Reyes** (Operations) has not submitted yet. Ana Cruz and Ben Lim have.';

function conversationFixture(id: string, title: string): Conversation {
  return {
    id,
    title,
    evaluationKind: 'five_percent',
    periodKey: MONTH_KEY,
    monthsBack: 3,
    lastMessageAt: '2026-10-24T01:00:00.000Z',
    createdAt: '2026-10-24T01:00:00.000Z',
  };
}

function sse(events: Array<Record<string, unknown>>): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
}

async function setupPage(page: Page, state: MockState, role: 'admin' | 'super_admin' = 'admin') {
  await page.addInitScript((mockRole) => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'admin-user',
        name: 'Admin User',
        email: 'admin@example.com',
        role: mockRole,
        isOnboardingComplete: true,
      })
    );
  }, role);

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/api/notifications') {
      await route.fulfill({
        json: {
          data: [],
          unreadCount: 0,
          pagination: { page: 1, pageSize: 5, total: 0, totalPages: 0 },
        },
      });
      return;
    }

    if (path === '/api/performance/evaluation-summaries') {
      await route.fulfill({
        json: { data: { summary: null, totalSubmissionsAnalyzed: 2, hasSourceData: true } },
      });
      return;
    }

    if (path === '/api/performance/insights/conversations') {
      await route.fulfill({
        json: { data: { conversations: state.conversations, total: state.conversations.length } },
      });
      return;
    }

    const itemMatch = path.match(/^\/api\/performance\/insights\/conversations\/([^/]+)$/);
    if (itemMatch) {
      const id = itemMatch[1] as string;
      const conversation = state.conversations.find((entry) => entry.id === id);
      if (request.method() === 'DELETE') {
        if (state.deleteStatus !== 204) {
          await route.fulfill({ status: state.deleteStatus, json: { error: 'Delete failed' } });
          return;
        }
        state.conversations = state.conversations.filter((entry) => entry.id !== id);
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      if (!conversation) {
        await route.fulfill({ status: 404, json: { error: 'Conversation not found' } });
        return;
      }
      if (request.method() === 'PATCH') {
        const body = request.postDataJSON() as { title: string };
        conversation.title = body.title.trim();
        await route.fulfill({ json: { data: conversation } });
        return;
      }
      await route.fulfill({
        json: {
          data: {
            conversation,
            messages: state.messages[id] ?? [],
            currentSnapshotHash: 'current',
            isStale: state.stale.has(id),
          },
        },
      });
      return;
    }

    if (path === '/api/performance/insights/chat') {
      const body = request.postDataJSON() as Record<string, unknown>;
      state.chatBodies.push(body);
      if (state.chatStatus !== 200) {
        await route.fulfill({
          status: state.chatStatus,
          json: {
            error: 'Question limit reached. Try again later.',
            details: { retryAfterSeconds: 3600 },
          },
        });
        return;
      }

      const id = (body.conversationId as string | undefined) ?? 'conv-new';
      const created = !body.conversationId;
      if (created) {
        state.conversations.unshift(conversationFixture(id, String(body.message)));
      }
      state.messages[id] = [
        ...(state.messages[id] ?? []),
        {
          id: `${id}-q`,
          role: 'user',
          content: String(body.message),
          status: 'complete',
          contextSnapshotHash: null,
          createdAt: '',
        },
        {
          id: `${id}-a`,
          role: 'assistant',
          content: ANSWER,
          status: 'complete',
          contextSnapshotHash: 'current',
          createdAt: '',
        },
      ];

      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: sse([
          { type: 'conversation', conversationId: id, title: String(body.message), created },
          {
            type: 'context',
            periodKey: MONTH_KEY,
            monthsIncluded: [MONTH_KEY],
            submittedCount: 2,
            pendingCount: 1,
            truncated: false,
            priorMode: 'P0',
            dataChangedSinceLastAnswer: false,
          },
          { type: 'content', text: ANSWER.slice(0, 20) },
          { type: 'content', text: ANSWER.slice(20) },
          { type: 'done', messageId: `${id}-a`, usage: { inputTokens: 900, outputTokens: 30 } },
        ]),
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

function trackErrors(page: Page) {
  const consoleErrors: Array<string> = [];
  const failedRequests: Array<string> = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') failedRequests.push(request.url());
  });
  return { consoleErrors, failedRequests };
}

function freshState(overrides: Partial<MockState> = {}): MockState {
  return {
    conversations: [],
    messages: {},
    stale: new Set(),
    chatStatus: 200,
    deleteStatus: 204,
    chatBodies: [],
    ...overrides,
  };
}

async function openPanel(page: Page) {
  await page.goto('/admin/performance/monthly-self-evaluations?tab=five-percent', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByText('5% Reflection Review')).toBeVisible({ timeout: 90_000 });
  const panel = page.getByRole('dialog', { name: 'Ask AI about 5% Reflections' });
  // Retry the click until hydration has attached the handler and the lazy panel chunk loads.
  await expect(async () => {
    await page.getByRole('button', { name: 'Ask AI', exact: true }).click();
    await expect(panel).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });
  return panel;
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900, role: 'admin' as const },
  { name: 'mobile', width: 390, height: 844, role: 'admin' as const },
  { name: 'super-admin desktop', width: 1440, height: 900, role: 'super_admin' as const },
]) {
  test(`asks a starter question and saves the conversation (${viewport.name})`, async ({
    page,
  }, testInfo) => {
    const errors = trackErrors(page);
    const state = freshState();
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await setupPage(page, state, viewport.role);

    const panel = await openPanel(page);
    await expect(panel.getByTestId('insight-window')).toContainText('+3 prior months');
    await expect(panel.getByText('No saved conversations yet.').first()).toBeAttached();

    await panel.getByRole('button', { name: "Who hasn't submitted this month?" }).click();

    await expect(panel.getByTestId('insight-answer').last()).toContainText('Cat Reyes');
    await expect(panel.getByText('Cat Reyes', { exact: true })).toBeVisible();
    expect(state.chatBodies[0]).toMatchObject({
      evaluationKind: 'five_percent',
      periodKey: MONTH_KEY,
      monthsBack: 3,
      message: "Who hasn't submitted this month?",
    });

    const shotName = viewport.name.replace(' ', '-');
    await page.screenshot({ path: testInfo.outputPath(`insights-${shotName}-thread.png`) });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: testInfo.outputPath(`insights-${shotName}-thread-dark.png`) });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));

    if (viewport.width < 1024) {
      await panel.getByRole('button', { name: 'History' }).click();
    }
    await expect(
      panel.getByRole('navigation', { name: 'Saved conversations' }).filter({ visible: true })
    ).toContainText("Who hasn't submitted this month?");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow).toBe(false);

    await page.screenshot({ path: testInfo.outputPath(`insights-${shotName}-history.png`) });
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.failedRequests).toEqual([]);
  });
}

test('follow-up questions reuse the open conversation', async ({ page }) => {
  const state = freshState({ conversations: [conversationFixture('conv-1', 'Pending teammates')] });
  state.messages['conv-1'] = [
    {
      id: 'm1',
      role: 'user',
      content: 'Pending teammates',
      status: 'complete',
      contextSnapshotHash: null,
      createdAt: '',
    },
    {
      id: 'm2',
      role: 'assistant',
      content: 'Cat Reyes is pending.',
      status: 'complete',
      contextSnapshotHash: 'current',
      createdAt: '',
    },
  ];
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupPage(page, state);

  const panel = await openPanel(page);
  await panel.getByRole('button', { name: 'Pending teammates', exact: true }).click();
  await expect(panel.getByText('Cat Reyes is pending.')).toBeVisible();
  await expect(panel.getByRole('combobox', { name: 'Earlier months to include' })).toHaveCount(0);

  await panel.getByLabel('Ask a question about the reflections').fill('And who submitted?');
  await panel.getByLabel('Ask a question about the reflections').press('Enter');

  await expect(panel.getByTestId('insight-answer')).toHaveCount(2);
  expect(state.chatBodies[0]).toMatchObject({
    conversationId: 'conv-1',
    message: 'And who submitted?',
  });
});

test('renames optimistically and rolls back a failed delete', async ({ page }) => {
  const errors = trackErrors(page);
  const state = freshState({
    conversations: [conversationFixture('conv-1', 'Family trends')],
    deleteStatus: 500,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupPage(page, state);

  const panel = await openPanel(page);
  const list = panel
    .getByRole('navigation', { name: 'Saved conversations' })
    .filter({ visible: true });

  await list.getByRole('button', { name: 'Actions for Family trends' }).click();
  await page.getByRole('menuitem', { name: 'Rename' }).click();
  const titleInput = panel.getByLabel('Conversation title');
  await titleInput.fill('Family rank drops');
  await titleInput.press('Enter');
  await expect(list.getByRole('button', { name: 'Family rank drops', exact: true })).toBeVisible();
  expect(state.conversations[0]?.title).toBe('Family rank drops');

  let confirmMessage = '';
  page.once('dialog', (dialog) => {
    confirmMessage = dialog.message();
    void dialog.accept();
  });
  await list.getByRole('button', { name: 'Actions for Family rank drops' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();

  await expect(page.getByText('Unable to delete')).toBeVisible();
  expect(confirmMessage).toContain('permanently erased after 30 days');
  await expect(list.getByRole('button', { name: 'Family rank drops', exact: true })).toBeVisible();

  state.deleteStatus = 204;
  page.once('dialog', (dialog) => void dialog.accept());
  await list.getByRole('button', { name: 'Actions for Family rank drops' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(list.getByText('No saved conversations yet.')).toBeVisible();

  // The failed DELETE is an expected 500 for this scenario.
  expect(errors.consoleErrors.filter((text) => !text.includes('500'))).toEqual([]);
});

test('shows the limit toast and restores the question on 429', async ({ page }) => {
  const state = freshState({ chatStatus: 429 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupPage(page, state);

  const panel = await openPanel(page);
  const composer = panel.getByLabel('Ask a question about the reflections');
  await composer.fill('Summarize the work headlines');
  await panel.getByRole('button', { name: 'Send question' }).click();

  await expect(page.getByText('Question limit reached')).toBeVisible();
  await expect(page.getByText('You can ask again in about 60 minutes.')).toBeVisible();
  await expect(composer).toHaveValue('Summarize the work headlines');
});

test('warns when reflections changed after the last answer', async ({ page }) => {
  const state = freshState({
    conversations: [conversationFixture('conv-1', 'Earlier analysis')],
    stale: new Set(['conv-1']),
  });
  state.messages['conv-1'] = [
    {
      id: 'm1',
      role: 'user',
      content: 'Earlier analysis',
      status: 'complete',
      contextSnapshotHash: null,
      createdAt: '',
    },
    {
      id: 'm2',
      role: 'assistant',
      content: 'Partial answer',
      status: 'aborted',
      contextSnapshotHash: 'old',
      createdAt: '',
    },
  ];
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupPage(page, state);

  const panel = await openPanel(page);
  await panel.getByRole('button', { name: 'Earlier analysis', exact: true }).click();

  await expect(
    panel.getByText('Reflections changed since the last answer.', { exact: false })
  ).toBeVisible();
  await expect(panel.getByText('Stopped')).toBeVisible();
});
