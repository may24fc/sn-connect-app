import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireUhpModule: vi.fn(),
  fetchUhpOutreachRows: vi.fn(),
}));

vi.mock('@/app/api/uhp/_lib', () => mocks);

import { GET } from '../../apps/web/src/app/api/uhp/clients/metrics/route';

describe('Outreach metrics reply cohort', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T02:00:00.000Z'));
    mocks.requireUhpModule.mockResolvedValue({ ok: true, context: { admin: {} } });
    mocks.fetchUhpOutreachRows.mockReset();
  });

  it('credits a reply this week to a client reached last week', async () => {
    const from = '2026-09-27T16:00:00.000Z';
    const to = '2026-10-04T15:59:59.999Z';
    mocks.fetchUhpOutreachRows
      .mockResolvedValueOnce({
        ok: true,
        rows: [
          {
            client_id: 'client-1',
            occurred_at: '2026-10-01T09:00:00.000Z',
            direction: 'outbound',
            reply_received: false,
            prospect_outcome: null,
            appointment_type: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        rows: [
          {
            client_id: 'client-1',
            occurred_at: '2026-10-07T09:00:00.000Z',
            direction: null,
            reply_received: true,
            manual_reply: true,
            prospect_outcome: null,
            appointment_type: null,
          },
        ],
      });

    const response = await GET(
      new NextRequest(
        `http://localhost/api/uhp/clients/metrics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      )
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      outreachAttempts: 1,
      replies: 1,
      clientsReachedOut: 1,
      responseRate: 100,
    });
    expect(mocks.fetchUhpOutreachRows).toHaveBeenNthCalledWith(1, {}, from, to);
    expect(mocks.fetchUhpOutreachRows).toHaveBeenNthCalledWith(
      2,
      {},
      '2026-10-04T16:00:00.000Z',
      '2026-10-08T02:00:00.000Z'
    );
    vi.useRealTimers();
  });
});
