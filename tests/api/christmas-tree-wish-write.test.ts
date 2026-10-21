import { logActivity } from '@/lib/audit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { upsertChristmasWish } from '../../apps/web/src/app/api/christmas-tree/_lib';

vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));

const activeEvent = {
  id: 'event-1',
  title: 'SN Christmas Wish Tree 2026',
  timezone: 'Asia/Manila',
  october_opens_at: '2000-10-01T00:00:00Z',
  october_closes_at: '2000-10-20T23:59:59Z',
  november_opens_at: '2000-11-01T00:00:00Z',
  november_closes_at: '2000-11-20T23:59:59Z',
  december_opens_at: '2000-12-01T00:00:00Z',
  december_closes_at: '2000-12-20T23:59:59Z',
  visible_until: '2027-01-15T23:59:59Z',
};

function terminalQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
  };
  return query;
}

function createAdminClient(updateData: { id: string } | null) {
  const eventQuery = terminalQuery({ data: activeEvent, error: null });
  const ornamentQuery = terminalQuery({ data: { id: 'ornament-1' }, error: null });
  const updateQuery = terminalQuery({ data: updateData, error: null });
  const insertQuery = terminalQuery({ data: { id: 'wish-1' }, error: null });
  const update = vi.fn(() => updateQuery);
  const insert = vi.fn(() => insertQuery);
  const wishTable = { update, insert };
  const from = vi.fn((table: string) => {
    if (table === 'christmas_tree_events') return eventQuery;
    if (table === 'christmas_ornaments') return ornamentQuery;
    if (table === 'christmas_wishes') return wishTable;
    throw new Error(`Unexpected table: ${table}`);
  });

  return { adminClient: { from } as never, update, insert };
}

describe('upsertChristmasWish', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts when no active wish exists instead of targeting the partial index with upsert', async () => {
    const { adminClient, update, insert } = createAdminClient(null);

    await upsertChristmasWish(adminClient, 'user-1', 'personal', 1, 'A peaceful holiday', null);

    expect(update).toHaveBeenCalledWith({
      content: 'A peaceful holiday',
      link_url: null,
      created_by: 'user-1',
    });
    expect(insert).toHaveBeenCalledWith({
      ornament_id: 'ornament-1',
      category: 'personal',
      item_number: 1,
      content: 'A peaceful holiday',
      link_url: null,
      created_by: 'user-1',
    });
    expect(logActivity).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({ recordId: 'wish-1' })
    );
  });

  it('updates an existing active wish without inserting another row', async () => {
    const { adminClient, update, insert } = createAdminClient({ id: 'wish-existing' });

    await upsertChristmasWish(
      adminClient,
      'user-1',
      'personal',
      2,
      'More time with family',
      'https://example.com'
    );

    expect(update).toHaveBeenCalledOnce();
    expect(insert).not.toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({ recordId: 'wish-existing' })
    );
  });
});
