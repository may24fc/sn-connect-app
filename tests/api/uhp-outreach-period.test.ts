import { describe, expect, it, vi } from 'vitest';

import { fetchUhpOutreachRows } from '../../apps/web/src/app/api/uhp/_lib';

function queryReturning(data: Array<Record<string, unknown>>) {
  const calls: Array<[string, string, unknown]> = [];
  const query = {
    select: vi.fn(() => query),
    is: vi.fn((column: string, value: unknown) => {
      calls.push(['is', column, value]);
      return query;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      calls.push(['eq', column, value]);
      return query;
    }),
    gte: vi.fn((column: string, value: unknown) => {
      calls.push(['gte', column, value]);
      return query;
    }),
    lte: vi.fn((column: string, value: unknown) => {
      calls.push(['lte', column, value]);
      return query;
    }),
    order: vi.fn(() => query),
    range: vi.fn(async () => ({ data, error: null })),
  };
  return { query, calls };
}

describe('fetchUhpOutreachRows period filtering', () => {
  it('applies the same explicit bounds to activities and manual timestamps', async () => {
    const from = '2026-10-04T16:00:00.000Z';
    const to = '2026-10-07T02:00:00.000Z';
    const activities = queryReturning([]);
    const manualReplies = queryReturning([
      { id: 'client-1', interest_state: 'unknown', replied: true },
    ]);
    const manualCalls = queryReturning([
      {
        id: 'client-2',
        interest_state: 'unknown',
        replied: false,
        called: true,
        called_at: to,
      },
    ]);
    let clientQueryCount = 0;
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'uhp_client_activities') return activities.query;
        clientQueryCount += 1;
        return clientQueryCount === 1 ? manualReplies.query : manualCalls.query;
      }),
    };

    const result = await fetchUhpOutreachRows(admin as never, from, to);

    expect(result).toMatchObject({
      ok: true,
      rows: [
        { client_id: 'client-1', reply_received: true },
        { client_id: 'client-2', appointment_type: 'call', manual_call: true },
      ],
    });
    expect(activities.calls).toEqual(
      expect.arrayContaining([
        ['gte', 'occurred_at', from],
        ['lte', 'occurred_at', to],
      ])
    );
    expect(activities.query.select).toHaveBeenCalledWith(expect.stringContaining('title'));
    expect(manualReplies.calls).toEqual(
      expect.arrayContaining([
        ['gte', 'replied_at', from],
        ['lte', 'replied_at', to],
      ])
    );
    expect(manualCalls.calls).toEqual(
      expect.arrayContaining([
        ['gte', 'called_at', from],
        ['lte', 'called_at', to],
      ])
    );
  });
});
