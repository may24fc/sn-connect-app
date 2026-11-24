import { beforeEach, describe, expect, it, vi } from 'vitest';

const openAiCreate = vi.fn();

vi.mock('@/app/api/ai/_lib', () => ({
  getAuthedSupabase: vi.fn(),
  getAdminClient: vi.fn(),
  isAiAdmin: vi.fn(() => true),
}));
vi.mock('@/lib/bsb/drive', () => ({
  readDocVersion: vi.fn(),
  hasCurrentDirectAccess: vi.fn(),
}));
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({ chat: { completions: { create: openAiCreate } } })),
}));

import { POST } from '@/app/api/bsb/chat/route';
import { getAdminClient, getAuthedSupabase } from '@/app/api/ai/_lib';
import { hasCurrentDirectAccess, readDocVersion } from '@/lib/bsb/drive';
import { parseOkfV02 } from '@/lib/bsb/okf';
import type { NextRequest } from 'next/server';

const FILE_ID = 'exact-doc-id';
const READER = 'reader@example.com';
const okf = parseOkfV02('The team agreed to ship the onboarding checklist on Friday.\n\nThe budget review moves to next week.');
const approvedRow = {
  id: 'source-1', title: 'Meeting note', drive_file_id: FILE_ID, tenant_key: 'sn-group', decision: 'approved',
  // PostgREST serializes timestamptz with +00:00, Google with Z.
  source_modified_at: '2026-11-24T02:01:16.986+00:00',
  source_owner_email: 'owner@example.com', classification: 'Recording', retention_rule: 'never',
  retention_until: null, processor: 'openai', acl_checked_at: '2026-11-24T03:00:00+00:00', expires_at: null,
  allowed_principals: [READER], revoked_at: null, okf,
};
const LIVE_VERSION = '2026-11-24T02:01:16.986Z';
const secondRow = { ...approvedRow, id: 'source-2', title: 'Second note', drive_file_id: 'second-doc-id',
  okf: parseOkfV02('The hiring freeze ends in January.\n\nThe team agreed to ship the onboarding checklist on Monday instead.') };

function chainable(result: unknown) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'is', 'contains']) builder[method] = vi.fn(() => builder);
  builder.maybeSingle = vi.fn().mockResolvedValue(result);
  builder.limit = vi.fn().mockResolvedValue(result);
  return builder;
}

function mockSession(rows: unknown[]) {
  vi.mocked(getAuthedSupabase).mockResolvedValue({
    supabase: { from: vi.fn(() => chainable({ data: { status: 'active' }, error: null })) },
    user: { id: 'user-1', email: READER, email_confirmed_at: '2026-11-24T00:00:00Z' },
    role: 'admin', error: null,
  } as unknown as Awaited<ReturnType<typeof getAuthedSupabase>>);
  vi.mocked(getAdminClient).mockReturnValue({
    from: vi.fn(() => chainable({ data: rows, error: null })),
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
  } as unknown as ReturnType<typeof getAdminClient>);
}

function ask(content: string) {
  return POST(new Request('http://localhost/api/bsb/chat', {
    method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content }] }),
  }) as unknown as NextRequest);
}

describe('/api/bsb/chat live source checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    mockSession([approvedRow]);
    vi.mocked(readDocVersion).mockResolvedValue(LIVE_VERSION);
    vi.mocked(hasCurrentDirectAccess).mockResolvedValue(true);
  });

  it('answers an authorized reader with a verbatim cited passage when the source is unchanged', async () => {
    openAiCreate.mockResolvedValue({ choices: [{ message: { content: '{"id":"S1-F1"}' } }] });
    const response = await ask('When will the team ship the onboarding checklist?');
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('The team agreed to ship the onboarding checklist on Friday.');
    expect(body).toContain('"exactQuote":"The team agreed to ship the onboarding checklist on Friday."');
    expect(openAiCreate).toHaveBeenCalledTimes(1);
  });

  it('denies and never calls the model when the Doc was edited after approval', async () => {
    vi.mocked(readDocVersion).mockResolvedValue('2026-11-24T05:00:00.000Z');
    const response = await ask('When will the team ship the onboarding checklist?');
    expect(response.status).toBe(404);
    expect(openAiCreate).not.toHaveBeenCalled();
  });

  it('denies and never calls the model when the Doc was deleted or trashed', async () => {
    vi.mocked(readDocVersion).mockRejectedValue(new Error('The configured source is unavailable'));
    const response = await ask('When will the team ship the onboarding checklist?');
    expect(response.status).toBe(404);
    expect(openAiCreate).not.toHaveBeenCalled();
  });

  it('denies when the reader lost direct Drive access', async () => {
    vi.mocked(hasCurrentDirectAccess).mockResolvedValue(false);
    const response = await ask('When will the team ship the onboarding checklist?');
    expect(response.status).toBe(404);
    expect(openAiCreate).not.toHaveBeenCalled();
  });

  it('abstains when the model selects a passage that was not offered', async () => {
    openAiCreate.mockResolvedValue({ choices: [{ message: { content: '{"id":"F99"}' } }] });
    const body = await (await ask('When will the team ship the onboarding checklist?')).text();
    expect(body).toContain('I cannot find an approved source passage');
    expect(body).not.toContain('"sources"');
  });

  it('returns 404 when the reader is on no approved source', async () => {
    mockSession([]);
    const response = await ask('When will the team ship the onboarding checklist?');
    expect(response.status).toBe(404);
    expect(readDocVersion).not.toHaveBeenCalled();
  });

  it('searches every approved Doc and cites the right one', async () => {
    mockSession([approvedRow, secondRow]);
    openAiCreate.mockResolvedValue({ choices: [{ message: { content: '{"id":"S2-F1"}' } }] });
    const body = await (await ask('When does the hiring freeze end?')).text();
    expect(body).toContain('"exactQuote":"The hiring freeze ends in January."');
    expect(body).toContain('"sourceId":"source-2"');
    expect(body).toContain('"sourceName":"Second note"');
    // Only the Doc that contributed passages is checked live.
    expect(readDocVersion).toHaveBeenCalledTimes(1);
    expect(readDocVersion).toHaveBeenCalledWith('second-doc-id');
  });

  it('drops an edited Doc but still answers from a live one', async () => {
    mockSession([approvedRow, secondRow]);
    vi.mocked(readDocVersion).mockImplementation(async (fileId) =>
      fileId === FILE_ID ? '2026-11-24T05:00:00.000Z' : LIVE_VERSION);
    openAiCreate.mockResolvedValue({ choices: [{ message: { content: '{"id":"S2-F2"}' } }] });
    const response = await ask('When will the team ship the onboarding checklist?');
    expect(response.status).toBe(200);
    const sent = JSON.parse(openAiCreate.mock.calls[0][0].messages[1].content) as { passages: Array<{ id: string }> };
    expect(sent.passages.map((passage) => passage.id)).toEqual(['S2-F2']);
    expect(await response.text()).toContain('"sourceId":"source-2"');
  });

  it('abstains without a model call when no passage matches the question', async () => {
    const body = await (await ask('Quarterly penguin migration?')).text();
    expect(body).toContain('I cannot find an approved source passage');
    expect(openAiCreate).not.toHaveBeenCalled();
    expect(readDocVersion).not.toHaveBeenCalled();
  });
});
