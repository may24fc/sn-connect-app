import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../apps/web/src/app/api/uhp/_lib', () => ({
  requireUhpModule: vi.fn(),
}));

import { requireUhpModule } from '../../apps/web/src/app/api/uhp/_lib';
import { GET } from '../../apps/web/src/app/api/uhp/clients/route';

type QueryResult = { data: Array<Record<string, unknown>>; error: null };

function createQuery(result: QueryResult) {
  const query = Object.assign(Promise.resolve(result), {
    select: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    or: vi.fn(() => query),
    eq: vi.fn(() => query),
    ilike: vi.fn(() => query),
    not: vi.fn(() => query),
  });
  return query;
}

function setup() {
  const clientsQuery = createQuery({ data: [], error: null });
  const sourcesQuery = createQuery({ data: [], error: null });
  const admin = {
    from: vi.fn().mockReturnValueOnce(clientsQuery).mockReturnValueOnce(sourcesQuery),
  };
  vi.mocked(requireUhpModule).mockResolvedValue({
    ok: true,
    context: { admin, userId: 'user-1' },
  } as never);
  return clientsQuery;
}

describe('GET /api/uhp/clients outreach result filters', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['replied', 'replied', true],
    ['declined', 'interest_state', 'declined'],
    ['we-form', 'we_form', true],
  ])('maps %s to the expected client field', async (filter, field, value) => {
    const query = setup();

    const response = await GET(
      new NextRequest(`http://localhost/api/uhp/clients?outreachResult=${filter}`)
    );

    expect(response.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith(field, value);
  });

  it('ignores an unsupported outreach result', async () => {
    const query = setup();

    expect(
      (await GET(new NextRequest('http://localhost/api/uhp/clients?outreachResult=unknown'))).status
    ).toBe(200);
    expect(query.eq).not.toHaveBeenCalled();
  });
});
