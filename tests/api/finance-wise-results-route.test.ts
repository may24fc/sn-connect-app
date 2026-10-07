import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/finance/auth', () => ({ getFinanceContext: vi.fn() }));
vi.mock('@/lib/wise/client', () => ({ getTransferStatus: vi.fn() }));

import { POST } from '@/app/api/finance/wise-batches/[id]/results/route';
import { getFinanceContext } from '@/lib/finance/auth';
import { getTransferStatus } from '@/lib/wise/client';

const batchId = '33333333-3333-3333-3333-333333333333';

describe('Wise batch result import', () => {
  const rpc = vi.fn(async () => ({ data: true, error: null }));
  const insert = vi.fn(async () => ({ error: null }));
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true, user: { id: 'reviewer' }, capabilities: { isLeadership: true },
      admin: {
        rpc,
        from: vi.fn((table: string) => {
          if (table === 'wise_batch_items') return { select: vi.fn(() => ({ eq: vi.fn(async () => ({ data: [
            { id: 'item-a', payment_reference: 'SNA', recipient_id: '123', amount: 100, source_currency: 'AUD', target_currency: 'PHP', status: 'exported' },
            { id: 'item-b', payment_reference: 'SNB', recipient_id: '456', amount: 50, source_currency: 'AUD', target_currency: 'PHP', status: 'exported' },
          ], error: null })) })) };
          if (table === 'wise_batch_import_rows') return { insert };
          if (table === 'wise_batches') return { update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) };
          throw new Error(`Unexpected table ${table}`);
        }),
      },
    } as never);
    vi.mocked(getTransferStatus).mockImplementation(async (id: number) => ({
      reference: id === 101 ? 'SNA' : 'SNB',
      targetAccount: id === 101 ? 123 : 456,
      sourceCurrency: 'AUD', targetCurrency: 'PHP', sourceValue: id === 101 ? 100 : 50,
      status: id === 101 ? 'outgoing_payment_sent' : 'funds_converted',
    }) as never);
  });

  it('pays only a verified final Wise transfer and retains partial and duplicate rows as exceptions', async () => {
    const csv = 'paymentReference,transferId,status\nSNA,101,completed\nSNB,102,processing\nSNA,101,completed';
    const response = await POST(new Request(`http://localhost/api/finance/wise-batches/${batchId}/results`, {
      method: 'POST', body: csv,
    }) as never, { params: Promise.resolve({ id: batchId }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.results.map((row: { result: string }) => row.result)).toEqual(['completed', 'failed', 'duplicate']);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(3);
  });
});
