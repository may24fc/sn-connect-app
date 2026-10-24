import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireInsightAdmin: vi.fn(),
  listConversations: vi.fn(),
  getConversation: vi.fn(),
  listMessages: vi.fn(),
  renameConversation: vi.fn(),
  softDeleteConversation: vi.fn(),
  loadInsightSource: vi.fn(),
  buildSnapshotHash: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock('../../apps/web/src/app/api/performance/insights/_lib', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../apps/web/src/app/api/performance/insights/_lib')
  >()),
  requireInsightAdmin: mocks.requireInsightAdmin,
}));
vi.mock('../../apps/web/src/app/api/performance/_lib', () => ({}));
vi.mock('@/lib/performance/insights/conversations', () => ({
  listConversations: mocks.listConversations,
  getConversation: mocks.getConversation,
  listMessages: mocks.listMessages,
  renameConversation: mocks.renameConversation,
  softDeleteConversation: mocks.softDeleteConversation,
}));
vi.mock('@/lib/performance/insights/source', () => ({
  loadInsightSource: mocks.loadInsightSource,
}));
vi.mock('@/lib/performance/insights/render', () => ({
  buildSnapshotHash: mocks.buildSnapshotHash,
}));
vi.mock('@/lib/audit', () => ({ logActivity: mocks.logActivity }));

const listRoute = await import(
  '../../apps/web/src/app/api/performance/insights/conversations/route'
);
const itemRoute = await import(
  '../../apps/web/src/app/api/performance/insights/conversations/[id]/route'
);

const ID = '22222222-2222-4222-8222-222222222222';
const conversation = {
  id: ID,
  title: 'Who is pending?',
  evaluationKind: 'five_percent',
  periodKey: '2026-10',
  monthsBack: 3,
  lastMessageAt: '2026-10-24T00:00:00Z',
  createdAt: '2026-10-24T00:00:00Z',
};
const params = { params: Promise.resolve({ id: ID }) };

function req(url: string, init?: { method?: string; body?: unknown }) {
  return new NextRequest(`http://localhost${url}`, {
    method: init?.method ?? 'GET',
    ...(init?.body === undefined
      ? {}
      : { body: JSON.stringify(init.body), headers: { 'Content-Type': 'application/json' } }),
  });
}

describe('performance insight conversation routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireInsightAdmin.mockResolvedValue({
      ok: true,
      context: { supabase: {}, supabaseAdmin: {}, user: { id: 'admin-1' }, role: 'super_admin' },
    });
    mocks.getConversation.mockResolvedValue(conversation);
  });

  it('forbids non-admins on every route', async () => {
    mocks.requireInsightAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    });

    const responses = await Promise.all([
      listRoute.GET(req('/api/performance/insights/conversations?evaluationKind=five_percent')),
      itemRoute.GET(req(`/api/performance/insights/conversations/${ID}`), params),
      itemRoute.PATCH(
        req(`/api/performance/insights/conversations/${ID}`, {
          method: 'PATCH',
          body: { title: 'x' },
        }),
        params
      ),
      itemRoute.DELETE(
        req(`/api/performance/insights/conversations/${ID}`, { method: 'DELETE' }),
        params
      ),
    ]);
    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403]);
    expect(mocks.listConversations).not.toHaveBeenCalled();
    expect(mocks.softDeleteConversation).not.toHaveBeenCalled();
  });

  it("lists only the caller's conversations with validated paging", async () => {
    mocks.listConversations.mockResolvedValue({ conversations: [conversation], total: 1 });

    const response = await listRoute.GET(
      req('/api/performance/insights/conversations?evaluationKind=five_percent&limit=10&offset=5')
    );

    expect(response.status).toBe(200);
    expect(mocks.listConversations).toHaveBeenCalledWith(
      {},
      {
        userId: 'admin-1',
        kind: 'five_percent',
        limit: 10,
        offset: 5,
      }
    );
    const invalid = await listRoute.GET(
      req('/api/performance/insights/conversations?evaluationKind=monthly')
    );
    expect(invalid.status).toBe(400);
  });

  it('flags a conversation as stale when the data changed since the last answer', async () => {
    mocks.listMessages.mockResolvedValue([
      {
        id: 'm1',
        role: 'user',
        content: 'q',
        status: 'complete',
        contextSnapshotHash: null,
        createdAt: '',
      },
      {
        id: 'm2',
        role: 'assistant',
        content: 'a',
        status: 'complete',
        contextSnapshotHash: 'old',
        createdAt: '',
      },
    ]);
    mocks.loadInsightSource.mockResolvedValue({});
    mocks.buildSnapshotHash.mockReturnValue('new');

    const response = await itemRoute.GET(
      req(`/api/performance/insights/conversations/${ID}`),
      params
    );
    const payload = (await response.json()) as {
      data: { isStale: boolean; messages: Array<unknown> };
    };

    expect(mocks.loadInsightSource).toHaveBeenCalledWith({}, {}, '2026-10', 3);
    expect(payload.data.isStale).toBe(true);
    expect(payload.data.messages).toHaveLength(2);
  });

  it('returns 404 for invalid ids and conversations hidden by RLS', async () => {
    const badId = await itemRoute.GET(req('/api/performance/insights/conversations/nope'), {
      params: Promise.resolve({ id: 'nope' }),
    });
    expect(badId.status).toBe(404);

    mocks.getConversation.mockResolvedValueOnce(null);
    const hidden = await itemRoute.DELETE(
      req(`/api/performance/insights/conversations/${ID}`, { method: 'DELETE' }),
      params
    );
    expect(hidden.status).toBe(404);
    expect(mocks.softDeleteConversation).not.toHaveBeenCalled();
  });

  it('validates rename titles', async () => {
    const empty = await itemRoute.PATCH(
      req(`/api/performance/insights/conversations/${ID}`, {
        method: 'PATCH',
        body: { title: '   ' },
      }),
      params
    );
    expect(empty.status).toBe(400);

    mocks.renameConversation.mockResolvedValueOnce({ ...conversation, title: 'Family trends' });
    const renamed = await itemRoute.PATCH(
      req(`/api/performance/insights/conversations/${ID}`, {
        method: 'PATCH',
        body: { title: ' Family trends ' },
      }),
      params
    );
    expect(renamed.status).toBe(200);
    expect(mocks.renameConversation).toHaveBeenCalledWith({}, ID, 'Family trends');
  });

  it('soft-deletes and audits without content', async () => {
    const response = await itemRoute.DELETE(
      req(`/api/performance/insights/conversations/${ID}`, { method: 'DELETE' }),
      params
    );

    expect(response.status).toBe(204);
    expect(mocks.softDeleteConversation).toHaveBeenCalledWith({}, ID);
    expect(mocks.logActivity).toHaveBeenCalledWith(
      {},
      {
        userId: 'admin-1',
        action: 'performance_insight_conversation_delete',
        tableName: 'performance_insight_conversations',
        recordId: ID,
        metadata: { evaluation_kind: 'five_percent', period_key: '2026-10' },
      }
    );
  });
});
