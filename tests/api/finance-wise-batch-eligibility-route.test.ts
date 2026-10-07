import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/finance/auth', () => ({
  getFinanceContext: vi.fn(),
  canReviewFinance: (capabilities: { isLeadership: boolean }) => capabilities.isLeadership,
}));

import { POST as exportBatch } from '@/app/api/finance/wise-batches/[id]/export/route';
import { GET, POST } from '@/app/api/finance/wise-batches/route';
import { getFinanceContext } from '@/lib/finance/auth';

const invoiceId = '11111111-1111-4111-8111-111111111111';
const secondInvoiceId = '22222222-2222-4222-8222-222222222222';
const batchId = '33333333-3333-4333-8333-333333333333';
const invoice = {
  id: invoiceId,
  employee_id: 'employee-1',
  invoice_number: 'INV-1',
  net_amount: 100,
  source_currency: 'AUD',
  target_currency: 'PHP',
  status: 'approved',
};
const header =
  'recipientId,recipientDetail,recipientType,sourceCurrency,targetCurrency,amount,amountCurrency,paymentReference';

describe('Finance Wise batch eligibility and template export', () => {
  const rpc = vi.fn();
  const from = vi.fn();
  let invoices: Array<Omit<typeof invoice, 'target_currency'> & { target_currency: string | null }>;
  let previousPayments: Array<{ invoice_id: string; payment_status: string }>;
  let batchItems: Array<{ invoice_id: string }>;
  let banking: Array<{ employee_id: string; wise_recipient_id: string; is_verified: boolean }>;

  beforeEach(() => {
    vi.clearAllMocks();
    invoices = [{ ...invoice }];
    previousPayments = [];
    batchItems = [];
    banking = [
      { employee_id: invoice.employee_id, wise_recipient_id: 'recipient-1', is_verified: true },
    ];
    rpc.mockResolvedValue({ data: batchId, error: null });
    from.mockImplementation((table: string) => {
      if (table === 'invoices' || table === 'wise_batches') {
        const query = {
          select: vi.fn(),
          eq: vi.fn(),
          is: vi.fn(),
          order: vi.fn(),
          limit: vi.fn(),
        };
        for (const method of ['select', 'eq', 'is', 'order'] as const)
          query[method].mockReturnValue(query);
        query.limit.mockResolvedValue({ data: table === 'invoices' ? invoices : [], error: null });
        return query;
      }
      if (
        table === 'wise_payments' ||
        table === 'employee_banking_info' ||
        table === 'wise_batch_items'
      ) {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => {
              const result = {
                data:
                  table === 'wise_payments'
                    ? previousPayments
                    : table === 'wise_batch_items'
                      ? batchItems
                      : banking,
                error: null,
              };
              return table === 'employee_banking_info'
                ? { is: vi.fn(async () => result) }
                : Promise.resolve(result);
            }),
            eq: vi.fn(() => ({
              order: vi.fn(async () => ({
                data: [
                  {
                    recipient_id: 'recipient-1',
                    payment_reference: 'SN-1',
                    amount: 100,
                    source_currency: 'AUD',
                    target_currency: 'PHP',
                  },
                ],
                error: null,
              })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true,
      user: { id: 'reviewer' },
      capabilities: { isLeadership: true },
      admin: { from, rpc },
    } as never);
  });

  it('excludes approved invoices with any pre-existing Wise payment or batch item', async () => {
    invoices.push({ ...invoice, id: secondInvoiceId, employee_id: 'employee-2' });
    banking.push({
      employee_id: 'employee-2',
      wise_recipient_id: 'recipient-2',
      is_verified: true,
    });
    previousPayments = [{ invoice_id: invoiceId, payment_status: 'failed' }];
    let response = await GET();
    expect(response.status).toBe(200);
    expect(
      (await response.json()).data.ready.map((row: { eligible: boolean }) => row.eligible)
    ).toEqual([false, true]);

    previousPayments = [];
    batchItems = [{ invoice_id: secondInvoiceId }];
    response = await GET();
    expect(
      (await response.json()).data.ready.map((row: { eligible: boolean }) => row.eligible)
    ).toEqual([true, false]);
  });

  it('does not offer zero-value or currency-incomplete invoices that the batch RPC rejects', async () => {
    invoices = [
      { ...invoice, net_amount: 0 },
      { ...invoice, id: secondInvoiceId, target_currency: null },
    ];
    const response = await GET();
    expect(
      (await response.json()).data.ready.every((row: { eligible: boolean }) => !row.eligible)
    ).toBe(true);
  });

  it('rejects a duplicate invoice selection before creating a batch', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/finance/wise-batches', {
        method: 'POST',
        body: JSON.stringify({ invoiceIds: [invoiceId, invoiceId] }),
      })
    );
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('returns the RPC eligibility conflict for pre-existing payments without creating a batch', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        message:
          'Invoices must be approved, unpaid, unbatched, have verified Wise recipients, and share one source currency',
      },
    });
    const response = await POST(
      new NextRequest('http://localhost/api/finance/wise-batches', {
        method: 'POST',
        body: JSON.stringify({ invoiceIds: [invoiceId] }),
      })
    );
    expect(response.status).toBe(409);
    expect(rpc).toHaveBeenCalledWith('create_finance_wise_batch', {
      invoice_ids: [invoiceId],
      actor_id: 'reviewer',
    });
  });

  async function exportTemplate(lines: Array<string>) {
    return exportBatch(
      new NextRequest(`http://localhost/api/finance/wise-batches/${batchId}/export`, {
        method: 'POST',
        body: [header, ...lines].join('\r\n'),
      }),
      { params: Promise.resolve({ id: batchId }) }
    );
  }

  it('rejects a saved-recipient template that does not match the batched recipient', async () => {
    const response = await exportTemplate(['recipient-2,Other,PERSON,AUD,PHP,0,AUD,']);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('recipient-1');
  });

  it('rejects ambiguous duplicate saved-recipient rows instead of selecting an arbitrary one', async () => {
    const response = await exportTemplate([
      'recipient-1,First,PERSON,AUD,PHP,0,AUD,',
      'recipient-1,Second,PERSON,AUD,PHP,0,AUD,',
    ]);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/multiple saved recipients/);
  });

  it('fills only matching saved-recipient rows with the batched amount and reference', async () => {
    const response = await exportTemplate([
      'recipient-2,Other,PERSON,AUD,PHP,0,AUD,',
      'recipient-1,Correct,PERSON,AUD,PHP,0,AUD,',
    ]);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      `${header}\r\nrecipient-1,Correct,PERSON,AUD,PHP,100.00,AUD,SN-1`
    );
  });
});
