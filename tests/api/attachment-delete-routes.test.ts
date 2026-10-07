import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
}));
vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));
vi.mock('../../apps/web/src/app/api/performance/_lib', () => ({
  getAuthedPerformanceContext: vi.fn(),
  resolveEmployeeIdForUser: vi.fn(),
}));
vi.mock('../../apps/web/src/app/api/announcements/_lib', () => ({
  getAuthedSupabase: vi.fn(),
  isAnnouncementAdmin: (role: string | null) => role === 'admin' || role === 'super_admin',
}));
vi.mock('../../apps/web/src/app/api/onboarding/_lib', () => ({
  getAuthedOnboardingContext: vi.fn(),
  isOnboardingAdmin: (role: string | null) => role === 'admin' || role === 'super_admin',
}));

import { getAuthedSupabase } from '../../apps/web/src/app/api/announcements/_lib';
import { DELETE as deleteAnnouncementAttachment } from '../../apps/web/src/app/api/announcements/[id]/attachments/[attachmentId]/route';
import { DELETE as deleteDocument } from '../../apps/web/src/app/api/documents/[id]/route';
import { getAuthedOnboardingContext } from '../../apps/web/src/app/api/onboarding/_lib';
import { DELETE as deleteOnboardingDocument } from '../../apps/web/src/app/api/onboarding/documents/[id]/route';
import { getAuthedPerformanceContext } from '../../apps/web/src/app/api/performance/_lib';
import { DELETE as deleteKpiEvidence } from '../../apps/web/src/app/api/performance/kpis/[id]/evidence/route';
import { DELETE as deleteContentImage } from '../../apps/web/src/app/api/reports/content-images/route';
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '../../apps/web/src/lib/supabase/server';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const DOC_ID = '22222222-2222-4222-8222-222222222222';
const KPI_ID = '33333333-3333-4333-8333-333333333333';

type Result = { data?: unknown; error?: unknown; count?: number | null };

/** A Supabase client whose queries resolve to queued results per table. */
function fakeClient(results: Record<string, Array<Result>>) {
  const updates: Array<{ table: string; values: unknown }> = [];
  // Order of destructive operations, e.g. ['delete:table', 'remove:storage'].
  const events: Array<string> = [];
  const remove = vi.fn(async () => {
    events.push('remove:storage');
    return { error: null };
  });
  const from = vi.fn((table: string) => {
    const next = (): Result => results[table]?.shift() ?? { data: null, error: null };
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'is', 'in', 'order']) {
      query[method] = vi.fn(() => query);
    }
    query.update = vi.fn((values: unknown) => {
      updates.push({ table, values });
      return query;
    });
    query.delete = vi.fn(() => {
      events.push(`delete:${table}`);
      return query;
    });
    query.single = vi.fn(async () => next());
    query.maybeSingle = vi.fn(async () => next());
    // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are awaitable.
    query.then = (resolve: (value: Result) => unknown) => Promise.resolve(next()).then(resolve);
    return query;
  });
  return {
    client: { from, storage: { from: vi.fn(() => ({ remove })) } },
    updates,
    remove,
    events,
  };
}

function signedInAs(role: string) {
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: { user: { id: USER_ID, app_metadata: { db_role: role } } },
        error: null,
      }),
    },
  } as never);
}

beforeEach(() => vi.clearAllMocks());

describe('DELETE /api/documents/[id]', () => {
  const call = () =>
    deleteDocument(new NextRequest('http://localhost/api/documents'), {
      params: Promise.resolve({ id: DOC_ID }),
    });

  it('refuses to delete a document an invoice depends on', async () => {
    signedInAs('employee');
    const { client, updates } = fakeClient({
      documents: [{ data: { id: DOC_ID, uploaded_by: USER_ID, employee_id: 'e1' } }],
      invoices: [{ count: 1, error: null }],
      expense_entries: [{ count: 0, error: null }],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as never);

    const response = await call();
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('an invoice');
    expect(updates).toHaveLength(0);
  });

  it('refuses to delete an expense receipt', async () => {
    signedInAs('admin');
    const { client, updates } = fakeClient({
      documents: [{ data: { id: DOC_ID, uploaded_by: 'someone-else', employee_id: 'e1' } }],
      invoices: [{ count: 0, error: null }],
      expense_entries: [{ count: 2, error: null }],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as never);

    const response = await call();
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('an expense');
    expect(updates).toHaveLength(0);
  });

  it('soft-deletes an unlinked document', async () => {
    signedInAs('employee');
    const { client, updates } = fakeClient({
      documents: [
        { data: { id: DOC_ID, uploaded_by: USER_ID, employee_id: 'e1' } },
        { error: null },
      ],
      invoices: [{ count: 0, error: null }],
      expense_entries: [{ count: 0, error: null }],
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as never);

    expect((await call()).status).toBe(200);
    expect(updates).toEqual([{ table: 'documents', values: { deleted_at: expect.any(String) } }]);
  });
});

describe('DELETE /api/performance/kpis/[id]/evidence', () => {
  const call = (evidenceId: string) =>
    deleteKpiEvidence(
      new NextRequest(
        `http://localhost/api/performance/kpis/${KPI_ID}/evidence?evidenceId=${evidenceId}`
      ),
      { params: Promise.resolve({ id: KPI_ID }) }
    );

  it('removes the stored file along with the evidence row', async () => {
    const { client, remove } = fakeClient({
      kpi_evidence: [
        {
          data: {
            id: DOC_ID,
            submitted_by: USER_ID,
            evidence_type: 'file',
            content: `${USER_ID}/proof.pdf`,
          },
        },
        { error: null },
      ],
    });
    vi.mocked(getAuthedPerformanceContext).mockResolvedValue({
      supabaseAdmin: client,
      user: { id: USER_ID },
      error: null,
    } as never);

    expect((await call(DOC_ID)).status).toBe(200);
    expect(remove).toHaveBeenCalledWith([`${USER_ID}/proof.pdf`]);
  });

  it('does not touch storage for link evidence, and rejects malformed ids', async () => {
    const { client, remove } = fakeClient({
      kpi_evidence: [
        {
          data: {
            id: DOC_ID,
            submitted_by: USER_ID,
            evidence_type: 'link',
            content: 'https://x.y',
          },
        },
        { error: null },
      ],
    });
    vi.mocked(getAuthedPerformanceContext).mockResolvedValue({
      supabaseAdmin: client,
      user: { id: USER_ID },
      error: null,
    } as never);

    expect((await call(DOC_ID)).status).toBe(200);
    expect(remove).not.toHaveBeenCalled();
    expect((await call('nope')).status).toBe(400);
  });
});

describe('DELETE /api/onboarding/documents/[id]', () => {
  const call = () =>
    deleteOnboardingDocument(new NextRequest('http://localhost/api/onboarding/documents'), {
      params: Promise.resolve({ id: DOC_ID }),
    });

  function withProfile(role: string, profile: Record<string, unknown>) {
    const fake = fakeClient({
      onboarding_documents: [
        { data: { id: DOC_ID, file_path: 'p/cv.pdf', onboarding_profiles: profile } },
        { error: null },
      ],
    });
    vi.mocked(getAuthedOnboardingContext).mockResolvedValue({
      supabase: fake.client,
      user: { id: USER_ID },
      role,
      error: null,
    } as never);
    return fake;
  }

  it('lets the employee remove a document while setup is in progress', async () => {
    const { remove } = withProfile('employee', { user_id: USER_ID, is_completed: false });
    expect((await call()).status).toBe(200);
    expect(remove).toHaveBeenCalledWith(['p/cv.pdf']);
  });

  it('lets the employee remove a document after HR rejected the submission', async () => {
    withProfile('employee', { user_id: USER_ID, is_completed: true, review_state: 'rejected' });
    expect((await call()).status).toBe(200);
  });

  it('locks documents once onboarding is submitted for review', async () => {
    const { updates, remove } = withProfile('employee', {
      user_id: USER_ID,
      is_completed: true,
      review_state: 'pending_review',
    });
    expect((await call()).status).toBe(409);
    expect(updates).toHaveLength(0);
    expect(remove).not.toHaveBeenCalled();
  });

  it('still lets an onboarding admin remove a submitted document', async () => {
    withProfile('admin', { user_id: 'someone-else', is_completed: true, review_state: null });
    expect((await call()).status).toBe(200);
  });
});

describe('DELETE /api/reports/content-images', () => {
  const call = (path: unknown) =>
    deleteContentImage(
      new NextRequest('http://localhost/api/reports/content-images', {
        method: 'DELETE',
        body: JSON.stringify({ path }),
      })
    );

  it('only accepts the exact path shape uploads create, inside the user folder', async () => {
    signedInAs('employee');
    const { client, remove } = fakeClient({});
    vi.mocked(createSupabaseAdminClient).mockReturnValue(client as never);

    expect((await call(`${USER_ID}/../other/${DOC_ID}.png`)).status).toBe(400);
    expect((await call(`${KPI_ID}/${DOC_ID}.png`)).status).toBe(400);
    expect((await call(42)).status).toBe(400);
    expect(remove).not.toHaveBeenCalled();

    expect((await call(`${USER_ID}/${DOC_ID}.png`)).status).toBe(204);
    expect(remove).toHaveBeenCalledWith([`${USER_ID}/${DOC_ID}.png`]);
  });
});

describe('DELETE /api/announcements/[id]/attachments/[attachmentId]', () => {
  const ANNOUNCEMENT_ID = '44444444-4444-4444-8444-444444444444';
  const call = (attachmentId = DOC_ID) =>
    deleteAnnouncementAttachment(new NextRequest('http://localhost/api/announcements'), {
      params: Promise.resolve({ id: ANNOUNCEMENT_ID, attachmentId }),
    });

  function asRole(role: string, attachment: Result['data']) {
    const fake = fakeClient({
      announcement_attachments: [{ data: attachment }, { error: null }, { count: 0 }],
      announcements: [{ error: null }],
    });
    vi.mocked(getAuthedSupabase).mockResolvedValue({
      supabase: fake.client,
      user: { id: USER_ID },
      role,
      error: null,
    } as never);
    return fake;
  }

  it('deletes the row before removing the file, and clears has_attachments', async () => {
    const { events, updates, remove } = asRole('admin', {
      id: DOC_ID,
      announcement_id: ANNOUNCEMENT_ID,
      file_path: `${ANNOUNCEMENT_ID}/file.pdf`,
      mime_type: 'application/pdf',
    });

    expect((await call()).status).toBe(200);
    expect(events).toEqual(['delete:announcement_attachments', 'remove:storage']);
    expect(remove).toHaveBeenCalledWith([`${ANNOUNCEMENT_ID}/file.pdf`]);
    expect(updates).toEqual([{ table: 'announcements', values: { has_attachments: false } }]);
  });

  it('returns 404 when the attachment is not on this announcement, without deleting', async () => {
    const { events } = asRole('admin', null);
    expect((await call()).status).toBe(404);
    expect(events).toHaveLength(0);
  });

  it('rejects non-admins and malformed ids', async () => {
    const { events } = asRole('employee', { id: DOC_ID });
    expect((await call()).status).toBe(403);
    expect((await call('not-a-uuid')).status).toBe(404);
    expect(events).toHaveLength(0);
  });
});
