import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/finance/auth', () => ({
  getFinanceContext: vi.fn(),
  canReviewFinance: (capabilities: { isLeadership: boolean; isAccounting: boolean }) =>
    capabilities.isLeadership || capabilities.isAccounting,
}));

import { GET } from '@/app/api/finance/expenses/export/route';
import { getFinanceContext } from '@/lib/finance/auth';

describe('Finance expense CSV export', () => {
  const range = vi.fn();
  const query = {
    select: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    ilike: vi.fn(),
    range,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    for (const method of ['select', 'is', 'order', 'eq', 'gte', 'lt', 'ilike'] as const) {
      query[method].mockReturnValue(query);
    }
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true,
      capabilities: { isLeadership: true, isAccounting: false },
      admin: { from: vi.fn(() => query) },
    } as never);
  });

  it('exports all matching rows with filters and spreadsheet-safe CSV fields', async () => {
    const row = {
      transaction_date: '2026-06-12',
      vendor_name: '=HYPERLINK("bad")',
      category_code: 'travel',
      expense_type: 'other',
      payment_source: 'personal_card',
      total_amount: 25,
      currency: 'AUD',
      total_amount_aud: 25,
      approval_state: 'approved',
      payment_status: 'paid',
      match_status: 'matched',
    };
    range.mockImplementation(async (start: number) =>
      start === 0
        ? { data: Array.from({ length: 1000 }, () => row), count: 1001, error: null }
        : { data: [row], count: 1001, error: null }
    );
    const response = await GET(
      new NextRequest(
        'http://localhost/api/finance/expenses/export?tab=personal_card&month=2026-06&category=travel&q=hello'
      )
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    const csv = await response.text();
    expect(csv.split('\r\n')).toHaveLength(1002);
    expect(csv).toContain(`"'=HYPERLINK(""bad"")"`);
    expect(query.eq).toHaveBeenCalledWith('payment_source', 'personal_card');
    expect(query.eq).toHaveBeenCalledWith('category_code', 'travel');
    expect(query.ilike).toHaveBeenCalledWith('vendor_name', '%hello%');
    expect(query.gte).toHaveBeenCalledWith('transaction_date', '2026-06-01');
    expect(query.lt).toHaveBeenCalledWith('transaction_date', '2026-07-01');
    expect(range).toHaveBeenCalledWith(1000, 1999);
  });

  it('rejects invalid filters and refuses to silently truncate an oversized export', async () => {
    expect(
      (await GET(new NextRequest('http://localhost/api/finance/expenses/export?month=2026-13')))
        .status
    ).toBe(400);
    range.mockResolvedValue({ data: [], count: 10001, error: null });
    const response = await GET(new NextRequest('http://localhost/api/finance/expenses/export'));
    expect(response.status).toBe(413);
    expect((await response.json()).error).toMatch(/10,000/);
  });

  it('escapes vendor pattern characters and reports incomplete exports', async () => {
    range.mockResolvedValue({ data: [], count: 1, error: null });
    const response = await GET(
      new NextRequest('http://localhost/api/finance/expenses/export?q=%25_%5C')
    );
    expect(query.ilike).toHaveBeenCalledWith('vendor_name', '%\\%\\_\\\\%');
    expect(response.status).toBe(500);
    expect((await response.json()).error).toMatch(/incomplete/);
  });
});
