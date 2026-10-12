import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/finance/auth', () => ({ getFinanceContext: vi.fn() }));
import { PATCH } from '@/app/api/finance/wise-batches/import-exceptions/[id]/route';
import { getFinanceContext } from '@/lib/finance/auth';

const id = '11111111-1111-4111-8111-111111111111';
const query = { update: vi.fn(), eq: vi.fn(), neq: vi.fn(), is: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
const request = (note: string) => new NextRequest(`http://localhost/api/finance/wise-batches/import-exceptions/${id}`, {
  method: 'PATCH', body: JSON.stringify({ note }), headers: { 'Content-Type': 'application/json' },
});

describe('Wise import exception resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of ['update', 'eq', 'neq', 'is', 'select'] as const) query[method].mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: { id }, error: null });
    vi.mocked(getFinanceContext).mockResolvedValue({ ok: true, user: { id }, capabilities: { isLeadership: true }, admin: { from: vi.fn(() => query) } } as never);
  });

  it('requires leadership and a review note', async () => {
    expect((await PATCH(request('short'), { params: Promise.resolve({ id }) })).status).toBe(400);
    vi.mocked(getFinanceContext).mockResolvedValueOnce({ ok: true, capabilities: { isLeadership: false } } as never);
    expect((await PATCH(request('Verified reference'), { params: Promise.resolve({ id }) })).status).toBe(403);
    expect(query.update).not.toHaveBeenCalled();
  });

  it('resolves only an open exception with actor and note', async () => {
    const response = await PATCH(request('Verified outside the batch'), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(200);
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ resolved_by: id, resolution_note: 'Verified outside the batch' }));
    expect(query.neq).toHaveBeenCalledWith('result', 'completed');
    expect(query.is).toHaveBeenCalledWith('resolved_at', null);
  });
});
