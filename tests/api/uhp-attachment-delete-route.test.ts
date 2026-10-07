import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../apps/web/src/app/api/uhp/_lib', () => ({
  requireUhpModule: vi.fn(),
}));
vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));

import { DELETE } from '../../apps/web/src/app/api/uhp/clients/[id]/attachments/[attachmentId]/route';
import { requireUhpModule } from '../../apps/web/src/app/api/uhp/_lib';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const ATTACHMENT_ID = '22222222-2222-4222-8222-222222222222';

function setup(row: { id: string; activity_id: string | null; storage_path: string } | null) {
  const update = vi.fn();
  const query = {
    update: vi.fn((values: unknown) => {
      update(values);
      return query;
    }),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    select: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: row, error: null })),
  };
  const remove = vi.fn(async () => ({ error: null }));
  const admin = {
    from: vi.fn(() => query),
    storage: { from: vi.fn(() => ({ remove })) },
  };
  vi.mocked(requireUhpModule).mockResolvedValue({
    ok: true,
    context: { admin, userId: 'user-1' },
  } as never);
  return { admin, update, remove };
}

function call(clientId = CLIENT_ID, attachmentId = ATTACHMENT_ID) {
  return DELETE(new NextRequest('http://localhost/api/uhp'), {
    params: Promise.resolve({ id: clientId, attachmentId }),
  });
}

describe('DELETE /api/uhp/clients/[id]/attachments/[attachmentId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects users without client tracker access', async () => {
    vi.mocked(requireUhpModule).mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Forbidden',
    } as never);
    expect((await call()).status).toBe(403);
  });

  it('soft-deletes the row and removes the stored file', async () => {
    const { update, remove } = setup({
      id: ATTACHMENT_ID,
      activity_id: null,
      storage_path: `${CLIENT_ID}/file.png`,
    });
    const response = await call();

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(remove).toHaveBeenCalledWith([`${CLIENT_ID}/file.png`]);
  });

  it('returns 404 when the screenshot is missing, already deleted, or on another client', async () => {
    const { remove } = setup(null);
    expect((await call()).status).toBe(404);
    expect(remove).not.toHaveBeenCalled();
  });

  it('returns 404 for malformed ids without touching the database', async () => {
    const { admin } = setup(null);
    expect((await call('not-a-uuid')).status).toBe(404);
    expect(admin.from).not.toHaveBeenCalled();
  });
});
