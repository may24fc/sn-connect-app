import { type PropertyRegister, monthlyRent, propertySummary } from '@/lib/finance/properties';
import { describe, expect, it } from 'vitest';

describe('Finance property figures', () => {
  const register: PropertyRegister = {
    properties: [
      {
        id: 'a',
        name: 'A',
        property_type: 'Residential',
        tenant_name: null,
        occupancy: 'occupied',
        weekly_rent_aud: 300,
        due_day: 10,
        created_by: 'u',
        created_at: '',
      },
      {
        id: 'b',
        name: 'B',
        property_type: 'Commercial',
        tenant_name: null,
        occupancy: 'vacant',
        weekly_rent_aud: 500,
        due_day: 12,
        created_by: 'u',
        created_at: '',
      },
    ],
    payments: [
      {
        id: 'p1',
        property_id: 'a',
        period_month: '2026-06-01',
        received_on: '2026-06-09',
        amount_aud: 500,
        reference: null,
        voided_at: null,
        void_reason: null,
        created_by: 'u',
        created_at: '',
      },
      {
        id: 'p2',
        property_id: 'a',
        period_month: '2026-06-01',
        received_on: '2026-06-10',
        amount_aud: 200,
        reference: null,
        voided_at: null,
        void_reason: null,
        created_by: 'u',
        created_at: '',
      },
    ],
    maintenance: [
      {
        id: 'm',
        property_id: 'a',
        job_date: '2026-06-08',
        description: 'Repair',
        contractor: null,
        cost_aud: 100,
        invoice_reference: null,
        status: 'awaiting_invoice',
        created_by: 'u',
        created_at: '',
      },
    ],
    statusEvents: [],
  };
  it('derives monthly equivalent from annual weekly rent, excluding vacant properties', () => {
    expect(monthlyRent(300)).toBe(1300);
    const summary = propertySummary(register, '2026-06', '2026-06-10');
    expect(summary).toMatchObject({
      due: 1300,
      received: 700,
      overdue: 0,
      maintenance: 100,
      missingInvoices: 1,
    });
    expect(summary.rows.map((row) => row.status)).toEqual(['Partially paid', 'Vacant']);
    expect(summary.rows[0]?.outstanding).toBe(600);
  });
  it('marks only unpaid balances past the due date overdue, and never calls recorded maintenance profit', () => {
    expect(propertySummary(register, '2026-06', '2026-06-11').overdue).toBe(600);
    const settled = propertySummary(
      {
        ...register,
        payments: [...register.payments, { ...register.payments[0]!, id: 'p3', amount_aud: 600 }],
      },
      '2026-06',
      '2026-06-11'
    );
    expect(settled.overdue).toBe(0);
    expect(settled.rows[0]?.status).toBe('Paid');
    const corrected = propertySummary(
      {
        ...register,
        payments: [{ ...register.payments[0]!, voided_at: '2026-06-12' }, register.payments[1]!],
      },
      '2026-06',
      '2026-06-12'
    );
    expect(corrected.received).toBe(200);
    expect(corrected.overdue).toBe(1100);
    expect(
      propertySummary(
        { properties: [], payments: [], maintenance: [], statusEvents: [] },
        '2026-06',
        '2026-06-11'
      ).due
    ).toBe(0);
  });
});
