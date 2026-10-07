import { GET, POST } from '@/app/api/finance/properties/route';
import { getFinanceContext } from '@/lib/finance/auth';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/finance/auth', () => ({
  getFinanceContext: vi.fn(),
  canReviewFinance: (capabilities: { isLeadership: boolean; isAccounting: boolean }) =>
    capabilities.isLeadership || capabilities.isAccounting,
}));

describe('Finance properties API', () => {
  const tables = new Map<string, { data: unknown[]; count: number; error: null }>();
  const insert = vi.fn();
  const from = vi.fn((table: string) => {
    const query = Object.assign(Promise.resolve(tables.get(table)), {
      select: vi.fn(),
      eq: vi.fn(),
      gte: vi.fn(),
      lt: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      insert,
      maybeSingle: vi.fn(async () => ({ data: { id: 'property' }, error: null })),
      single: vi.fn(async () => ({ data: { id: 'created' }, error: null })),
    });
    for (const method of ['select', 'eq', 'gte', 'lt', 'in', 'order', 'limit', 'insert'] as const)
      query[method].mockReturnValue(query);
    return query;
  });
  const request = (body: unknown) =>
    new NextRequest('http://localhost/api/finance/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    tables.clear();
    for (const table of [
      'finance_properties',
      'finance_property_rent_payments',
      'finance_property_maintenance',
      'finance_property_maintenance_status_events',
    ])
      tables.set(table, { data: [], count: 0, error: null });
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true,
      user: { id: 'user' },
      capabilities: { isLeadership: false, isAccounting: true },
      admin: { from },
    } as never);
  });

  it('requires Finance access before reading or writing with the admin client', async () => {
    vi.mocked(getFinanceContext).mockResolvedValue({
      ok: true,
      user: { id: 'user' },
      capabilities: { isLeadership: false, isAccounting: false },
      admin: { from },
    } as never);
    expect(
      (await GET(new NextRequest('http://localhost/api/finance/properties?month=2026-06'))).status
    ).toBe(403);
    expect((await POST(request({ kind: 'property' }))).status).toBe(403);
    expect(from).not.toHaveBeenCalled();
  });

  it('validates month, limits, and returns a genuinely empty register without sample records', async () => {
    expect(
      (await GET(new NextRequest('http://localhost/api/finance/properties?month=2026-13'))).status
    ).toBe(400);
    const response = await GET(
      new NextRequest('http://localhost/api/finance/properties?month=2026-06')
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({
      properties: [],
      payments: [],
      maintenance: [],
      statusEvents: [],
    });
    tables.set('finance_properties', { data: [], count: 501, error: null });
    expect(
      (await GET(new NextRequest('http://localhost/api/finance/properties?month=2026-06'))).status
    ).toBe(413);
    tables.set('finance_properties', { data: [], count: 1, error: null });
    expect(
      (await GET(new NextRequest('http://localhost/api/finance/properties?month=2026-06'))).status
    ).toBe(500);
  });

  it('validates writes and records a property, partial rent and maintenance', async () => {
    expect((await POST(request({ kind: 'rent', amountAud: -1 }))).status).toBe(400);
    expect((await POST(request({
      kind: 'rent', propertyId: '123e4567-e89b-42d3-a456-426614174000',
      month: '2026-06', receivedOn: '2026-06-15', amountAud: 1.001, reference: null,
    }))).status).toBe(400);
    const property = await POST(
      request({
        kind: 'property',
        name: 'New',
        propertyType: 'Residential',
        tenantName: null,
        occupancy: 'occupied',
        weeklyRentAud: 350,
        dueDay: 15,
      })
    );
    expect(property.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New', created_by: 'user' })
    );
    const rent = await POST(
      request({
        kind: 'rent',
        propertyId: '123e4567-e89b-42d3-a456-426614174000',
        month: '2026-06',
        receivedOn: '2026-06-15',
        amountAud: 100,
        reference: null,
      })
    );
    expect(rent.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ period_month: '2026-06-01', amount_aud: 100 })
    );
    const maintenance = await POST(
      request({
        kind: 'maintenance',
        propertyId: '123e4567-e89b-42d3-a456-426614174000',
        jobDate: '2026-06-20',
        description: 'Roof inspection',
        contractor: null,
        costAud: 80,
        invoiceReference: null,
        status: 'awaiting_invoice',
      })
    );
    expect(maintenance.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Roof inspection', status: 'awaiting_invoice' })
    );
  });

  it('includes complete maintenance status history for records in the selected month', async () => {
    tables.set('finance_property_maintenance', {
      data: [{ id: 'maintenance-id', job_date: '2026-06-09' }],
      count: 1,
      error: null,
    });
    tables.set('finance_property_maintenance_status_events', {
      data: [
        {
          id: 'history-id',
          maintenance_id: 'maintenance-id',
          previous_status: 'scheduled',
          next_status: 'paid',
        },
      ],
      count: 1,
      error: null,
    });
    const response = await GET(
      new NextRequest('http://localhost/api/finance/properties?month=2026-06')
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data.statusEvents).toHaveLength(1);
    expect(from).toHaveBeenCalledWith('finance_property_maintenance_status_events');
  });
});
