import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
  eq: vi.fn(),
  callback: vi.fn(() => true),
  rpc: vi.fn(),
}));
vi.mock('../../apps/web/src/app/api/uhp/_lib', () => ({
  requireUhpModule: mocks.auth,
  isValidN8nCallback: mocks.callback,
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({ from: mocks.from }),
}));

import { GET as digest } from '../../apps/web/src/app/api/uhp/volume-points/digest/route';
import { GET as summary } from '../../apps/web/src/app/api/uhp/volume-points/summary/route';
import { DELETE, PUT } from '../../apps/web/src/app/api/uhp/volume-points/targets/route';

const standards = [
  { category: 'personal', effective_from: '2026-11-01', target_vp: 500, forecast_vp: 400 },
];
let failingTable: string | null = null;
let monthlyActuals: Array<{ reporting_month: string; volume_points: number; source: string }> = [];
let finalTotal: number | null = null;
let overrides: Array<{
  reporting_month: string;
  category: string;
  target_vp: number;
  forecast_vp: number;
}> = [];

function request(path: string, method = 'GET', body?: unknown) {
  return new NextRequest(`http://localhost/api/uhp/volume-points/${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
}

function authorize(role = 'admin', workspaceAccessLevel: string | null = null) {
  mocks.auth.mockResolvedValue({
    ok: true,
    context: {
      userId: 'target-editor',
      role,
      workspaceAccessLevel,
      admin: { from: mocks.from, rpc: mocks.rpc },
      supabase: { from: mocks.from },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  failingTable = null;
  overrides = [];
  monthlyActuals = [];
  finalTotal = null;
  mocks.rpc.mockImplementation(async () => ({
    data: monthlyActuals,
    error: failingTable === 'uhp_vp_monthly_actuals' ? { message: 'Test RPC failure' } : null,
  }));
  mocks.callback.mockReturnValue(true);
  authorize();
  mocks.from.mockImplementation((table: string) => {
    const result = () => ({
      data:
        table === 'uhp_vp_standard_targets'
          ? standards
          : table === 'uhp_vp_month_targets'
            ? overrides
            : [],
      error: table === failingTable ? { message: 'Test failure' } : null,
    });
    const query = Object.assign(Promise.resolve().then(result), {
      select: vi.fn(() => query),
      order: vi.fn(() => query),
      eq: vi.fn((...args: Array<unknown>) => {
        mocks.eq(...args);
        return query;
      }),
      gte: vi.fn(() => query),
      lte: vi.fn(() => query),
      is: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({
        data:
          table === 'uhp_vp_month_actuals' && finalTotal !== null
            ? { volume_points: finalTotal }
            : null,
        error: table === failingTable ? { message: 'Test failure' } : null,
      })),
      upsert: vi.fn((...args: Array<unknown>) => {
        mocks.upsert(table, ...args);
        return query;
      }),
      delete: vi.fn(() => {
        mocks.remove(table);
        return query;
      }),
    });
    return query;
  });
});

describe('VP reusable standards API', () => {
  it('uses approved final totals for monthly and quarterly Actual VP without inventing categories', async () => {
    monthlyActuals = [
      { reporting_month: '2026-01-01', volume_points: 1319.1, source: 'final' },
      { reporting_month: '2026-02-01', volume_points: 2224.32, source: 'final' },
      { reporting_month: '2026-03-01', volume_points: 1852.22, source: 'final' },
      { reporting_month: '2026-11-01', volume_points: 418.55, source: 'orders' },
    ];
    const january = await (await summary(request('summary?month=2026-01'))).json();
    expect(january.data.totalActualVp).toBe(1319.1);
    expect(january.data.finalizedMonths).toEqual(['2026-01-01']);
    expect(january.data.categories.every((row: { actualVp: number }) => row.actualVp === 0)).toBe(
      true
    );
    expect(january.data.overall).toHaveLength(4);
    const quarter = await (
      await summary(request('summary?fromMonth=2026-01&toMonth=2026-03'))
    ).json();
    expect(quarter.data.totalActualVp).toBeCloseTo(5395.64, 2);
    const november = await (await summary(request('summary?month=2026-11'))).json();
    expect(november.data.totalActualVp).toBe(418.55);
    expect(november.data.finalizedMonths).toEqual([]);
    failingTable = 'uhp_vp_monthly_actuals';
    expect((await summary(request('summary?month=2026-01'))).status).toBe(500);
  });

  it('rejects invalid monthly aggregation data instead of reporting a false total', async () => {
    monthlyActuals = [{ reporting_month: '2026-01-01', volume_points: 1319.1, source: 'unknown' }];
    const response = await summary(request('summary?month=2026-01'));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Invalid monthly actuals response' });
  });

  it('uses an explicit final zero in the digest rather than treating it as missing', async () => {
    finalTotal = 0;
    const payload = await (await digest(request('digest'))).json();
    expect(payload.data.totalActualVp).toBe(0);
    finalTotal = 1319.1;
    const imported = await (await digest(request('digest'))).json();
    expect(imported.data.totalActualVp).toBe(1319.1);
    failingTable = 'uhp_vp_month_actuals';
    expect((await digest(request('digest'))).status).toBe(500);
  });

  const targets = [{ category: 'personal', targetVp: 600, forecastVp: 450 }];

  it('saves standards separately from monthly overrides', async () => {
    expect(
      (
        await PUT(
          request('targets', 'PUT', {
            scope: 'standards',
            reportingMonth: '2026-12-01',
            targets,
          })
        )
      ).status
    ).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(
      'uhp_vp_standard_targets',
      [{ category: 'personal', target_vp: 600, forecast_vp: 450, updated_by: 'target-editor' }],
      { onConflict: 'category' }
    );
    expect(mocks.from).not.toHaveBeenCalledWith('uhp_vp_month_targets');
  });

  it('keeps existing month-save requests compatible, including zero overrides', async () => {
    const response = await PUT(
      request('targets', 'PUT', {
        reportingMonth: '2026-12-15',
        targets: [{ category: 'personal', targetVp: 0, forecastVp: 0 }],
      })
    );
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(
      'uhp_vp_month_targets',
      [
        {
          reporting_month: '2026-12-01',
          category: 'personal',
          target_vp: 0,
          forecast_vp: 0,
          created_by: 'target-editor',
          updated_by: 'target-editor',
        },
      ],
      { onConflict: 'reporting_month,category' }
    );
  });

  it('resets only the selected month and never deletes standards', async () => {
    expect(
      (await DELETE(request('targets', 'DELETE', { reportingMonth: '2026-12-01' }))).status
    ).toBe(200);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.remove).toHaveBeenCalledWith('uhp_vp_month_targets');
    expect(mocks.eq).toHaveBeenCalledWith('reporting_month', '2026-12-01');
  });

  it.each([
    { targets: [] },
    { targets: [targets[0], targets[0]] },
    { targets: [{ category: 'invalid', targetVp: 1, forecastVp: 1 }] },
    { targets: [{ category: 'personal', targetVp: -1, forecastVp: 1 }] },
    { targets: [{ category: 'personal', targetVp: 10000000000, forecastVp: 1 }] },
    { scope: 'invalid', targets },
    { reportingMonth: '2026-13-01', targets },
  ])('rejects invalid input without writing: %j', async (input) => {
    expect(
      (
        await PUT(
          request('targets', 'PUT', {
            reportingMonth: '2026-12-01',
            ...input,
          })
        )
      ).status
    ).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('rejects malformed reset requests', async () => {
    expect((await DELETE(request('targets', 'DELETE', {}))).status).toBe(400);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it('denies read-only workspace users before using either database client', async () => {
    authorize('workspace_user', 'read');
    expect(
      (await PUT(request('targets', 'PUT', { reportingMonth: '2026-12-01', targets }))).status
    ).toBe(403);
    expect(
      (await DELETE(request('targets', 'DELETE', { reportingMonth: '2026-12-01' }))).status
    ).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('preserves the module access boundary', async () => {
    mocks.auth.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' });
    expect((await PUT(request('targets', 'PUT', {}))).status).toBe(403);
    expect((await DELETE(request('targets', 'DELETE', {}))).status).toBe(403);
    expect((await summary(request('summary?month=2026-12'))).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('surfaces standards read and write failures rather than returning zero or success', async () => {
    failingTable = 'uhp_vp_standard_targets';
    expect((await summary(request('summary?month=2026-12'))).status).toBe(500);
    expect(
      (
        await PUT(
          request('targets', 'PUT', {
            scope: 'standards',
            reportingMonth: '2026-12-01',
            targets,
          })
        )
      ).status
    ).toBe(500);
  });

  it('surfaces a failed reset', async () => {
    failingTable = 'uhp_vp_month_targets';
    expect(
      (await DELETE(request('targets', 'DELETE', { reportingMonth: '2026-12-01' }))).status
    ).toBe(500);
  });

  it('resolves December defaults and sums quarterly overrides plus standards', async () => {
    const december = await (await summary(request('summary?month=2026-12'))).json();
    expect(december.data).toMatchObject({ totalTargetVp: 500, totalForecastVp: 400 });
    expect(december.data.effectiveTargets[0].source).toBe('standard');
    overrides = [
      { reporting_month: '2026-11-01', category: 'personal', target_vp: 200, forecast_vp: 100 },
    ];
    const quarter = await (
      await summary(request('summary?fromMonth=2026-10&toMonth=2026-12'))
    ).json();
    expect(quarter.data).toMatchObject({ totalTargetVp: 700, totalForecastVp: 500 });
  });

  it('uses the same standards in the authenticated digest', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-10T02:00:00Z'));
    try {
      const payload = await (await digest(request('digest'))).json();
      expect(payload.data).toMatchObject({ totalTargetVp: 500, totalForecastVp: 400 });
      failingTable = 'uhp_vp_standard_targets';
      expect((await digest(request('digest'))).status).toBe(500);
      mocks.callback.mockReturnValue(false);
      expect((await digest(request('digest'))).status).toBe(401);
    } finally {
      vi.useRealTimers();
    }
  });
});
