import { buildFinanceReportPackSupplement } from '@/lib/finance/report-pack';
import { describe, expect, it, vi } from 'vitest';

function fakeAdmin(records: Record<string, Array<Record<string, unknown>>>) {
  const from = vi.fn((table: string) => {
    const rows = records[table] ?? [];
    const query = {
      select: vi.fn(() => query),
      order: vi.fn(() => query),
      gte: vi.fn(() => query),
      lt: vi.fn(() => query),
      range: vi.fn(async (start: number, end: number) => ({
        data: rows.slice(start, end + 1),
        count: rows.length,
        error: null,
      })),
    };
    return query;
  });
  return { from } as never;
}

describe('Finance snapshot pack sources', () => {
  it('retains the real register and Wise import month without treating an unlinked charge as paid', async () => {
    const supplement = await buildFinanceReportPackSupplement(
      fakeAdmin({
        finance_subscriptions: [
          {
            id: 'sub-1',
            vendor_name: 'Canva',
            active: true,
            payment_source: 'company_card',
            monthly_amount_aud: 25,
            seats: 3,
            next_renewal: '2026-07-01',
          },
        ],
        finance_subscription_last_charges: [],
        wise_batch_import_rows: [
          {
            payment_reference: 'ref-1',
            result: 'failed',
            detail: 'Needs review',
            imported_at: '2026-06-18T00:00:00Z',
            resolved_at: null,
          },
        ],
      }),
      '2026-06'
    );
    expect(supplement.subscriptionsAsOfSnapshot[0]).toMatchObject({
      vendor_name: 'Canva',
      last_charged: null,
    });
    expect(supplement.wiseImportRowsForMonth).toHaveLength(1);
  });

  it('rejects an oversized source instead of silently saving a partial pack', async () => {
    const admin = {
      from: vi.fn(() => {
        const query = {
          select: vi.fn(() => query),
          order: vi.fn(() => query),
          gte: vi.fn(() => query),
          lt: vi.fn(() => query),
          range: vi.fn(async () => ({ data: [], count: 10001, error: null })),
        };
        return query;
      }),
    } as never;
    await expect(buildFinanceReportPackSupplement(admin, '2026-06')).rejects.toThrow('10,000');
  });

  it('reads every subscription after a 1,000-row server page', async () => {
    const subscriptions = Array.from({ length: 1001 }, (_, index) => ({
      id: `sub-${index}`, vendor_name: `Vendor ${index}`, active: true,
      payment_source: 'company_card', monthly_amount_aud: null, seats: null, next_renewal: null,
    }));
    const supplement = await buildFinanceReportPackSupplement(fakeAdmin({
      finance_subscriptions: subscriptions,
      finance_subscription_last_charges: [],
      wise_batch_import_rows: [],
    }), '2026-06');
    expect(supplement.subscriptionsAsOfSnapshot).toHaveLength(1001);
  });
});
