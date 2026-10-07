import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../apps/web/src/app/api/uhp/_lib', () => ({
  requireUhpModule: vi.fn(),
}));
vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));

import { requireUhpModule } from '../../apps/web/src/app/api/uhp/_lib';
import { PATCH } from '../../apps/web/src/app/api/uhp/clients/[id]/route';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';

function setup(existingReplied: boolean) {
  const update = vi.fn();
  let singleRow = false;
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    update: vi.fn((values: unknown) => {
      update(values);
      singleRow = true;
      return query;
    }),
    maybeSingle: vi.fn(async () => ({
      data: { status: 'Prospect', interest_state: 'unknown', replied: existingReplied },
      error: null,
    })),
    single: vi.fn(async () => ({
      data: singleRow ? { id: CLIENT_ID } : null,
      error: null,
    })),
    insert: vi.fn(async () => ({ error: null })),
  };
  const admin = { from: vi.fn(() => query) };
  vi.mocked(requireUhpModule).mockResolvedValue({
    ok: true,
    context: { admin, userId: 'user-1' },
  } as never);
  return { update };
}

function call(replied: boolean) {
  return PATCH(
    new NextRequest(`http://localhost/api/uhp/clients/${CLIENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replied }),
    }),
    { params: Promise.resolve({ id: CLIENT_ID }) }
  );
}

describe('PATCH /api/uhp/clients/[id] manual reply timestamp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('timestamps a newly checked reply', async () => {
    const { update } = setup(false);

    expect((await call(true)).status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ replied: true, replied_at: expect.any(String) })
    );
  });

  it('clears the timestamp when the reply is unchecked', async () => {
    const { update } = setup(true);

    expect((await call(false)).status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ replied: false, replied_at: null })
    );
  });

  it('preserves the original timestamp when the boolean does not change', async () => {
    const { update } = setup(true);

    expect((await call(true)).status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.not.objectContaining({ replied_at: expect.anything() })
    );
  });
});
