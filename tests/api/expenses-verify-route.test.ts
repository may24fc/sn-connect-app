import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn(), createSupabaseAdminClient: vi.fn() }));
vi.mock('@/lib/expenses/capabilities', () => ({ resolveExpenseCapabilities: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));

import { POST } from '@/app/api/expenses/[id]/verify/route';
import { resolveExpenseCapabilities } from '@/lib/expenses/capabilities';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

const requestId = '11111111-1111-1111-1111-111111111111';
const paymentId = '22222222-2222-2222-2222-222222222222';
const request = () => new Request(`http://localhost/api/expenses/${requestId}/verify`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ counterpartEntryId: paymentId, matchStatus: 'matched', matchedNotes: 'Invoice differs from receipt' }),
}) as never;

describe('expense matching API', () => {
  const rpc = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'actor-1' } }, error: null })) } } as never);
    vi.mocked(createSupabaseAdminClient).mockReturnValue({
      rpc,
      from: vi.fn(() => ({ select: vi.fn(() => ({ in: vi.fn(() => ({ is: vi.fn(async () => ({ data: [
        { id: requestId, source_type: 'staff_request' }, { id: paymentId, source_type: 'direct_payment' },
      ], error: null })) })) })) })),
    } as never);
  });

  it('lets an accounting reviewer confirm a match through the atomic database function', async () => {
    vi.mocked(resolveExpenseCapabilities).mockResolvedValue({ canMatch: true } as never);
    rpc.mockResolvedValue({ data: { matchStatus: 'variance_flagged', varianceAmountAud: 10 }, error: null });
    const response = await POST(request(), { params: Promise.resolve({ id: requestId }) });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('reconcile_finance_expense', {
      request_id: requestId, payment_id: paymentId, actor_id: 'actor-1', reason: 'Invoice differs from receipt',
    });
  });

  it('denies staff without matching access before touching ledger rows', async () => {
    vi.mocked(resolveExpenseCapabilities).mockResolvedValue({ canMatch: false } as never);
    const response = await POST(request(), { params: Promise.resolve({ id: requestId }) });
    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
});
