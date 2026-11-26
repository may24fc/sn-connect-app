import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/ai/_lib', () => ({
  getAuthedSupabase: vi.fn(),
  getAdminClient: vi.fn(),
  isAiAdmin: vi.fn(() => true),
}));
vi.mock('@/lib/bsb/drive', () => ({
  readExactDoc: vi.fn(),
  readDocVersion: vi.fn(),
  listDirectUserEmails: vi.fn(),
  hasCurrentDirectAccess: vi.fn(),
}));

import { GET, PATCH, POST } from '@/app/api/bsb/sources/route';
import { getAdminClient, getAuthedSupabase } from '@/app/api/ai/_lib';
import { hasCurrentDirectAccess, listDirectUserEmails, readDocVersion, readExactDoc } from '@/lib/bsb/drive';
import { parseOkfV02 } from '@/lib/bsb/okf';
import type { NextRequest } from 'next/server';

const ROW_ID = '11111111-1111-4111-8111-111111111111';
const draft = {
  id: ROW_ID, drive_file_id: 'doc-id', decision: 'draft', title: 'Meeting note',
  source_modified_at: '2026-11-24T02:01:16.986+00:00', source_owner_email: 'owner@example.com',
  okf: parseOkfV02('The approved meeting note contains a factual decision.\n\nThe second passage records an action.'),
};
const update = vi.fn();
const insert = vi.fn();

function builder(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'neq']) chain[method] = vi.fn(() => chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.update = vi.fn((values: unknown) => { update(values); return chain; });
  chain.insert = vi.fn((values: unknown) => { insert(values); return chain; });
  chain.then = (resolve: (value: unknown) => void) => resolve({ error: null });
  return chain;
}

function approve(readers = ['reader@example.com']) {
  return PATCH(new Request('http://localhost/api/bsb/sources', { method: 'PATCH', body: JSON.stringify({
    id: ROW_ID, action: 'approve', classification: 'Recording', retentionRule: 'never',
    processor: 'openai', allowedPrincipals: readers,
  }) }) as unknown as NextRequest);
}

describe('/api/bsb/sources approval live checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: { from: vi.fn(() => builder({ data: { status: 'active' }, error: null })) },
      user: { id: 'admin-1', email: 'admin@example.com', email_confirmed_at: '2026-11-24T00:00:00Z' }, role: 'admin', error: null,
    } as unknown as Awaited<ReturnType<typeof getAuthedSupabase>>);
    vi.mocked(getAdminClient).mockReturnValue({
      from: vi.fn(() => builder({ data: draft, error: null })),
    } as unknown as ReturnType<typeof getAdminClient>);
    vi.mocked(readDocVersion).mockResolvedValue('2026-11-24T02:01:16.986Z');
    vi.mocked(listDirectUserEmails).mockResolvedValue(new Set(['reader@example.com', 'owner@example.com', 'admin@example.com']));
    vi.mocked(hasCurrentDirectAccess).mockResolvedValue(true);
  });

  it('lists metadata without sending the verbatim note to an admin', async () => {
    const select = vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({
      data: [{ id: ROW_ID, title: 'Meeting note', decision: 'draft' }], error: null,
    }) })) }));
    vi.mocked(getAdminClient).mockReturnValue({ from: vi.fn(() => ({ select })) } as unknown as ReturnType<typeof getAdminClient>);
    const response = await GET(new Request('http://localhost/api/bsb/sources') as unknown as NextRequest);
    expect(response.status).toBe(200);
    expect(select).toHaveBeenCalledWith('id,title,drive_file_id,decision,classification,source_owner_email,retention_rule,retention_until,acl_checked_at,reviewer_id,expires_at,revoked_at');
    expect(await response.text()).not.toContain(draft.okf.sourceText);
  });

  it('does not return draft passages when the admin lacks direct Doc access', async () => {
    vi.mocked(hasCurrentDirectAccess).mockResolvedValue(false);
    const response = await GET(new Request(`http://localhost/api/bsb/sources?id=${ROW_ID}`) as unknown as NextRequest);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(draft.okf.facts[0].exactQuote);
    expect(readDocVersion).not.toHaveBeenCalled();
  });

  it('returns only passages to an admin with current direct access and an unchanged Doc', async () => {
    const response = await GET(new Request(`http://localhost/api/bsb/sources?id=${ROW_ID}`) as unknown as NextRequest);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.facts).toEqual(draft.okf.facts);
    expect(body.data.sourceText).toBeUndefined();
  });

  it('blocks import before export when the admin lacks direct Doc access', async () => {
    vi.mocked(hasCurrentDirectAccess).mockResolvedValue(false);
    const response = await POST(new Request('http://localhost/api/bsb/sources', { method: 'POST',
      body: JSON.stringify({ source: 'https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-xy/edit' }),
    }) as unknown as NextRequest);
    expect(response.status).toBe(403);
    expect(readExactDoc).not.toHaveBeenCalled();
  });

  it('approves when the Doc is unchanged and every reader has direct access', async () => {
    const response = await approve();
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ decision: 'approved', allowed_principals: ['reader@example.com'] }));
  });

  it('names the readers who lack direct access', async () => {
    const response = await approve(['reader@example.com', 'Link.Only@Example.com']);
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('link.only@example.com');
    expect(update).not.toHaveBeenCalled();
  });

  it('blocks approval when the approving admin lacks direct Doc access', async () => {
    vi.mocked(listDirectUserEmails).mockResolvedValue(new Set(['reader@example.com']));
    const response = await approve();
    expect(response.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it('asks for a re-import when the Doc changed after import', async () => {
    vi.mocked(readDocVersion).mockResolvedValue('2026-11-24T05:00:00.000Z');
    const response = await approve();
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('Import the same link again');
  });

  it('asks for Editor sharing when the ACL cannot be listed', async () => {
    vi.mocked(listDirectUserEmails).mockRejectedValue(Object.assign(new Error('Forbidden'), { code: 403 }));
    const response = await approve();
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('as Editor');
  });

  it('reports a Doc the service account can no longer open', async () => {
    vi.mocked(readDocVersion).mockRejectedValue(new Error('not found'));
    const response = await approve();
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('can no longer open');
  });

  it('re-importing an approved Doc refreshes it back to an unpublished draft and audits it', async () => {
    vi.mocked(getAdminClient).mockReturnValue({
      from: vi.fn(() => builder({ data: { id: ROW_ID, decision: 'approved' }, error: null })),
    } as unknown as ReturnType<typeof getAdminClient>);
    vi.mocked(readExactDoc).mockResolvedValue({ title: 'Meeting note', text: draft.okf.sourceText,
      modifiedAt: '2026-11-24T07:03:01.806Z', ownerEmail: 'owner@example.com' });
    const response = await POST(new Request('http://localhost/api/bsb/sources', { method: 'POST',
      body: JSON.stringify({ source: 'https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-xy/edit' }),
    }) as unknown as NextRequest);
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ decision: 'draft', allowed_principals: [],
      reviewer_id: null, revoked_at: null, source_modified_at: '2026-11-24T07:03:01.806Z' }));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ action: 'bsb_source_reimported_to_draft',
      record_id: ROW_ID, metadata: { previous_decision: 'approved' } }));
  });
});
