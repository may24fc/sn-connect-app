import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireInsightAdmin: vi.fn(),
  countRecentQuestions: vi.fn(),
  getConversation: vi.fn(),
  createConversation: vi.fn(),
  insertMessage: vi.fn(),
  listRecentMessages: vi.fn(),
  touchConversation: vi.fn(),
  loadInsightSource: vi.fn(),
  streamCompletion: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock('../../apps/web/src/app/api/performance/insights/_lib', () => ({
  requireInsightAdmin: mocks.requireInsightAdmin,
}));
vi.mock('@/lib/performance/insights/conversations', () => ({
  countRecentQuestions: mocks.countRecentQuestions,
  getConversation: mocks.getConversation,
  createConversation: mocks.createConversation,
  insertMessage: mocks.insertMessage,
  listRecentMessages: mocks.listRecentMessages,
  touchConversation: mocks.touchConversation,
}));
vi.mock('@/lib/performance/insights/source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/performance/insights/source')>()),
  loadInsightSource: mocks.loadInsightSource,
}));
vi.mock('@hr-portal/ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@hr-portal/ai')>()),
  streamCompletion: mocks.streamCompletion,
}));
vi.mock('@/lib/audit', () => ({ logActivity: mocks.logActivity }));
vi.mock('langwatch/observability', () => ({
  getLangWatchTracer: () => ({
    startSpan: () => ({
      setType: vi.fn(),
      setRequestModel: vi.fn(),
      setAttribute: vi.fn(),
      setMetrics: vi.fn(),
      end: vi.fn(),
    }),
  }),
}));

const { buildInsightSource } = await import('@/lib/performance/insights/source');
const { POST } = await import('../../apps/web/src/app/api/performance/insights/chat/route');

const QUESTION = 'Whose family rank dropped the most this month?';
const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

const conversation = {
  id: CONVERSATION_ID,
  title: QUESTION,
  evaluationKind: 'five_percent',
  periodKey: '2026-10',
  monthsBack: 3,
  lastMessageAt: '2026-10-24T00:00:00Z',
  createdAt: '2026-10-24T00:00:00Z',
};

const source = buildInsightSource({
  periodKey: '2026-10',
  monthsBack: 3,
  audience: [{ userId: 'u-ana', fullName: 'Ana Cruz', departmentRole: 'Marketing' }],
  rows: [
    {
      user_id: 'u-ana',
      full_name: 'Ana Cruz',
      month_key: '2026-10',
      department_role: 'Marketing',
      work_rank: 7,
      family_rank: 4,
      personal_rank: 6,
      work_headline: 'Campaign shipped',
    },
  ],
});

function request(body: unknown) {
  return new NextRequest('http://localhost/api/performance/insights/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const validBody = { evaluationKind: 'five_percent', periodKey: '2026-10', message: QUESTION };

async function readEvents(response: Response) {
  const text = await response.text();
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((frame) => JSON.parse(frame.replace(/^data: /, '')) as Record<string, unknown>);
}

describe('POST /api/performance/insights/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    mocks.requireInsightAdmin.mockResolvedValue({
      ok: true,
      context: { supabase: {}, supabaseAdmin: {}, user: { id: 'admin-1' }, role: 'admin' },
    });
    mocks.countRecentQuestions.mockResolvedValue(0);
    mocks.listRecentMessages.mockResolvedValue([]);
    mocks.loadInsightSource.mockResolvedValue(source);
    mocks.createConversation.mockResolvedValue(conversation);
    mocks.insertMessage.mockResolvedValueOnce('question-1').mockResolvedValueOnce('answer-1');
    mocks.touchConversation.mockResolvedValue(undefined);
    mocks.streamCompletion.mockImplementation(async function* () {
      yield { type: 'text_delta', text: 'Person-01 (October 2026) ' };
      yield { type: 'text_delta', text: 'ranked family 4.' };
      yield { type: 'done', usage: { inputTokens: 900, outputTokens: 12 } };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the guard response for unauthenticated or non-admin callers', async () => {
    mocks.requireInsightAdmin.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    });
    const response = await POST(request(validBody));
    expect(response.status).toBe(403);
    expect(mocks.loadInsightSource).not.toHaveBeenCalled();
  });

  it.each([
    ['an over-long question', { ...validBody, message: 'x'.repeat(2001) }],
    ['an unsupported evaluation kind', { ...validBody, evaluationKind: 'monthly' }],
    ['a malformed month', { ...validBody, periodKey: '2026-13-01' }],
  ])('rejects %s with 400', async (_label, body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
  });

  it('returns 503 when the AI key is missing', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const response = await POST(request(validBody));
    expect(response.status).toBe(503);
  });

  it('returns 429 with Retry-After when the hourly limit is reached', async () => {
    mocks.countRecentQuestions.mockResolvedValueOnce(30).mockResolvedValueOnce(30);
    const response = await POST(request(validBody));
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('3600');
    expect(await response.json()).toMatchObject({ details: { retryAfterSeconds: 3600 } });
  });

  it('returns 404 for a conversation the caller cannot see', async () => {
    mocks.getConversation.mockResolvedValueOnce(null);
    const response = await POST(request({ ...validBody, conversationId: CONVERSATION_ID }));
    expect(response.status).toBe(404);
    expect(mocks.insertMessage).not.toHaveBeenCalled();
  });

  it('returns 422 without creating a conversation when the window has no reflections', async () => {
    mocks.loadInsightSource.mockResolvedValueOnce({ ...source, reflections: [] });
    const response = await POST(request(validBody));
    expect(response.status).toBe(422);
    expect(mocks.createConversation).not.toHaveBeenCalled();
  });

  it('streams events in order, persists both turns, and audits metadata only', async () => {
    const response = await POST(request(validBody));
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    expect(response.headers.get('Server-Timing')).toContain('insight_context');

    const events = await readEvents(response);
    expect(events.map((event) => event.type)).toEqual([
      'conversation',
      'context',
      'content',
      'content',
      'done',
    ]);
    expect(events[0]).toMatchObject({ conversationId: CONVERSATION_ID, created: true });
    expect(events[1]).toMatchObject({ submittedCount: 1, truncated: false, priorMode: 'P0' });
    expect(events[2]).toMatchObject({ text: 'Ana Cruz (October 2026) ' });
    expect(events[4]).toMatchObject({ messageId: 'answer-1' });

    expect(mocks.createConversation).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: 'admin-1',
        periodKey: '2026-10',
        monthsBack: 3,
        title: QUESTION,
      })
    );
    expect(mocks.insertMessage).toHaveBeenNthCalledWith(
      1,
      {},
      expect.objectContaining({ role: 'user', content: QUESTION })
    );
    expect(mocks.insertMessage).toHaveBeenNthCalledWith(
      2,
      {},
      expect.objectContaining({
        role: 'assistant',
        status: 'complete',
        content: 'Ana Cruz (October 2026) ranked family 4.',
        inputTokens: 900,
      })
    );

    const generateCall = mocks.streamCompletion.mock.calls[0]?.[0] as {
      systemPrompt: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(generateCall.systemPrompt).toContain('person="Person-01"');
    expect(generateCall.systemPrompt).not.toContain('Ana Cruz');
    expect(generateCall.messages).toEqual([{ role: 'user', content: QUESTION }]);

    const audit = mocks.logActivity.mock.calls[0]?.[1] as { action: string; metadata: object };
    expect(audit.action).toBe('performance_insight_query');
    expect(audit.metadata).toMatchObject({ outcome: 'complete', question_length: QUESTION.length });
    const auditText = JSON.stringify(audit);
    expect(auditText).not.toContain(QUESTION);
    expect(auditText).not.toContain('Ana Cruz');
  });

  it('sends names to the model only as tokens and restores split tokens in the answer', async () => {
    mocks.streamCompletion.mockImplementation(async function* () {
      yield { type: 'text_delta', text: 'Pers' };
      yield { type: 'text_delta', text: 'on-0' };
      yield { type: 'text_delta', text: '1 wrote about the campaign.' };
      yield { type: 'done', usage: { inputTokens: 10, outputTokens: 5 } };
    });

    const events = await readEvents(
      await POST(request({ ...validBody, message: 'What did Ana Cruz say about work?' }))
    );

    const generateCall = mocks.streamCompletion.mock.calls[0]?.[0] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(generateCall.messages.at(-1)?.content).toBe('What did Person-01 say about work?');

    const streamed = events
      .filter((event) => event.type === 'content')
      .map((event) => event.text)
      .join('');
    expect(streamed).toBe('Ana Cruz wrote about the campaign.');
    expect(streamed).not.toContain('Person-');

    // The question is stored as typed; the answer is stored with names restored.
    expect(mocks.insertMessage).toHaveBeenNthCalledWith(
      1,
      {},
      expect.objectContaining({ role: 'user', content: 'What did Ana Cruz say about work?' })
    );
    expect(mocks.insertMessage).toHaveBeenNthCalledWith(
      2,
      {},
      expect.objectContaining({ role: 'assistant', content: 'Ana Cruz wrote about the campaign.' })
    );
  });

  it('uses the stored window and database history for an existing conversation', async () => {
    mocks.getConversation.mockResolvedValueOnce({
      ...conversation,
      periodKey: '2026-09',
      monthsBack: 1,
    });
    mocks.listRecentMessages.mockResolvedValueOnce([
      {
        id: 'm1',
        role: 'user',
        content: 'Earlier question',
        status: 'complete',
        contextSnapshotHash: null,
        createdAt: '',
      },
      {
        id: 'm2',
        role: 'assistant',
        content: 'Earlier answer',
        status: 'complete',
        contextSnapshotHash: 'old-hash',
        createdAt: '',
      },
    ]);

    const response = await POST(
      request({
        ...validBody,
        conversationId: CONVERSATION_ID,
        periodKey: '2026-10',
        monthsBack: 6,
      })
    );
    const events = await readEvents(response);

    expect(mocks.loadInsightSource).toHaveBeenCalledWith({}, {}, '2026-09', 1);
    expect(mocks.createConversation).not.toHaveBeenCalled();
    expect(events[1]).toMatchObject({ dataChangedSinceLastAnswer: true });
    const generateCall = mocks.streamCompletion.mock.calls[0]?.[0] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(generateCall.messages.map((message) => message.content)).toEqual([
      'Earlier question',
      'Earlier answer',
      QUESTION,
    ]);
  });

  it('marks the answer as failed and sends a generic error when generation fails', async () => {
    mocks.streamCompletion.mockImplementation(async function* () {
      yield { type: 'error', error: 'upstream secret detail' };
    });

    const events = await readEvents(await POST(request(validBody)));
    const last = events.at(-1);
    expect(last).toMatchObject({ type: 'error', code: 'llm_failed' });
    expect(JSON.stringify(last)).not.toContain('upstream secret detail');
    expect(mocks.insertMessage).toHaveBeenNthCalledWith(
      2,
      {},
      expect.objectContaining({ role: 'assistant', status: 'error' })
    );
  });
});
