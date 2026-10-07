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
  it('applies the same explicit bounds to activities and manual reply timestamps', async () => {
    const from = '2026-10-04T16:00:00.000Z';
    const to = '2026-10-07T02:00:00.000Z';
    const activities = queryReturning([]);
    const manualReplies = queryReturning([
      { id: 'client-1', interest_state: 'unknown', replied: true },
    ]);
    const admin = {
      from: vi.fn((table: string) =>
        table === 'uhp_client_activities' ? activities.query : manualReplies.query
      ),
    };

    const result = await fetchUhpOutreachRows(admin as never, from, to);

    expect(result).toMatchObject({
      ok: true,
      rows: [{ client_id: 'client-1', reply_received: true }],
    });
    expect(activities.calls).toEqual(
      expect.arrayContaining([
        ['gte', 'occurred_at', from],
        ['lte', 'occurred_at', to],
      ])
    );
    expect(manualReplies.calls).toEqual(
      expect.arrayContaining([
        ['gte', 'replied_at', from],
        ['lte', 'replied_at', to],
      ])
    );
  });
});
