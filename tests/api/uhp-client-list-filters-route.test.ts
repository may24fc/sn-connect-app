import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../apps/web/src/app/api/uhp/_lib', () => ({
  requireUhpModule: vi.fn(),
}));

import { requireUhpModule } from '../../apps/web/src/app/api/uhp/_lib';
import { GET } from '../../apps/web/src/app/api/uhp/clients/route';

type QueryResult = { data: Array<Record<string, unknown>>; error: null; count?: number };

function createQuery(result: QueryResult) {
  const query = Object.assign(Promise.resolve(result), {
    select: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    or: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    ilike: vi.fn(() => query),
    not: vi.fn(() => query),
  });
  return query;
}

function setup() {
  const clientsQuery = createQuery({ data: [], error: null });
  const sourcesQuery = createQuery({ data: [], error: null });
  const repliedCountQuery = createQuery({ data: [], error: null, count: 7 });
  const declinedCountQuery = createQuery({ data: [], error: null, count: 3 });
  const weFormCountQuery = createQuery({ data: [], error: null, count: 2 });
  const admin = {
    from: vi
      .fn()
      .mockReturnValueOnce(clientsQuery)
      .mockReturnValueOnce(repliedCountQuery)
      .mockReturnValueOnce(declinedCountQuery)
      .mockReturnValueOnce(weFormCountQuery)
      .mockReturnValueOnce(sourcesQuery),
  };
  vi.mocked(requireUhpModule).mockResolvedValue({
    ok: true,
    context: { admin, userId: 'user-1' },
  } as never);
  return { clientsQuery, repliedCountQuery, declinedCountQuery, weFormCountQuery };
}

describe('GET /api/uhp/clients outreach result filters', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['replied', 'replied', true],
    ['declined', 'interest_state', 'declined'],
    ['we-form', 'we_form', true],
  ])('maps %s to the expected client field', async (filter, field, value) => {
    const { clientsQuery } = setup();

    const response = await GET(
      new NextRequest(`http://localhost/api/uhp/clients?outreachResult=${filter}`)
    );

    expect(response.status).toBe(200);
    expect(clientsQuery.eq).toHaveBeenCalledWith(field, value);
  });

  it('ignores an unsupported outreach result', async () => {
    const { clientsQuery } = setup();

    expect(
      (await GET(new NextRequest('http://localhost/api/uhp/clients?outreachResult=unknown'))).status
    ).toBe(200);
    expect(clientsQuery.eq).not.toHaveBeenCalled();
  });

  it('returns totals for every result and applies the date range to each count', async () => {
    const { repliedCountQuery, declinedCountQuery, weFormCountQuery } = setup();
    const from = '2026-11-01T00:00:00.000Z';
    const to = '2026-11-09T23:59:59.999Z';

    const response = await GET(
      new NextRequest(
        `http://localhost/api/uhp/clients?outreachResult=declined&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      filterCounts: { replied: 7, declined: 3, weForm: 2 },
    });
    expect(repliedCountQuery.gte).toHaveBeenCalledWith('replied_at', from);
    expect(declinedCountQuery.gte).toHaveBeenCalledWith('interest_state_at', from);
    expect(weFormCountQuery.gte).toHaveBeenCalledWith('we_form_at', from);
  });

  it('returns the union of all recorded result types when only a date range is selected', async () => {
    const { clientsQuery } = setup();
    const from = '2026-11-01T00:00:00.000Z';
    const to = '2026-11-09T23:59:59.999Z';

    const response = await GET(
      new NextRequest(
        `http://localhost/api/uhp/clients?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      )
    );

    expect(response.status).toBe(200);
    expect(clientsQuery.or).toHaveBeenCalledWith(
      `and(replied.eq.true,replied_at.gte.${from},replied_at.lte.${to}),` +
        `and(interest_state.eq.declined,interest_state_at.gte.${from},interest_state_at.lte.${to}),` +
        `and(we_form.eq.true,we_form_at.gte.${from},we_form_at.lte.${to})`
    );
  });

  it('rejects an incomplete custom date range', async () => {
    setup();

    expect(
      (await GET(new NextRequest('http://localhost/api/uhp/clients?from=2026-11-01T00:00:00.000Z')))
        .status
    ).toBe(400);
  });
});
