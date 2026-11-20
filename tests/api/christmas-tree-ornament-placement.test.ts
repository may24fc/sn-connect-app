import { logActivity } from '@/lib/audit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { placeChristmasOrnament } from '../../apps/web/src/app/api/christmas-tree/_lib';

vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));

const activeEvent = {
  id: 'event-1',
  title: 'SN Christmas Wish Tree 2026',
  timezone: 'Asia/Manila',
  october_opens_at: '2026-10-01T00:00:00Z',
  october_closes_at: '2026-12-31T23:59:59Z',
  november_opens_at: '2026-10-01T00:00:00Z',
  november_closes_at: '2026-12-31T23:59:59Z',
  december_opens_at: '2026-10-01T00:00:00Z',
  december_closes_at: '2026-12-31T23:59:59Z',
  visible_until: '2026-12-31T23:59:59Z',
};

function terminalQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    not: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
  };
  return query;
}

function createAdminClient(removedOrnamentId: string | null) {
  const eventQuery = terminalQuery({ data: activeEvent, error: null });
  const existingQuery = terminalQuery({ data: null, error: null });
  const positionsQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(async () => ({ data: [], error: null })),
  };
  positionsQuery.select.mockReturnValue(positionsQuery);
  positionsQuery.eq.mockReturnValue(positionsQuery);

  const removedQuery = terminalQuery({
    data: removedOrnamentId ? { id: removedOrnamentId } : null,
    error: null,
  });
  const restoredQuery = terminalQuery({
    data: removedOrnamentId ? { id: removedOrnamentId } : null,
    error: null,
  });
  const insertedQuery = terminalQuery({ data: { id: 'new-ornament' }, error: null });
  const update = vi.fn(() => restoredQuery);
  const insert = vi.fn(() => insertedQuery);
  let ornamentCall = 0;
  const from = vi.fn((table: string) => {
    if (table === 'christmas_tree_events') return eventQuery;
    if (table !== 'christmas_ornaments') throw new Error(`Unexpected table: ${table}`);
    ornamentCall += 1;
    if (ornamentCall === 1) return existingQuery;
    if (ornamentCall === 2) return positionsQuery;
    if (ornamentCall === 3) return removedQuery;
    return removedOrnamentId ? { update } : { insert };
  });

  return { adminClient: { from } as never, insert, update };
}

describe('placeChristmasOrnament', () => {
  beforeEach(() => vi.clearAllMocks());

  it('restores the latest removed ball so its wishes remain attached', async () => {
    const { adminClient, insert, update } = createAdminClient('removed-ornament');

    await placeChristmasOrnament(adminClient, 'user-1', 'burgundy', 50, 45);

    expect(update).toHaveBeenCalledWith({
      asset_type: 'burgundy',
      position_x: 50,
      position_y: 45,
      deleted_at: null,
    });
    expect(insert).not.toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        action: 'RESTORE_CHRISTMAS_ORNAMENT',
        recordId: 'removed-ornament',
        metadata: expect.objectContaining({ preservedWishes: true }),
      })
    );
  });

  it('creates a new ball when the user has no removed ball', async () => {
    const { adminClient, insert, update } = createAdminClient(null);

    await placeChristmasOrnament(adminClient, 'user-1', 'red', 50, 45);

    expect(update).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith({
      event_id: activeEvent.id,
      user_id: 'user-1',
      asset_type: 'red',
      position_x: 50,
      position_y: 45,
      created_by: 'user-1',
    });
    expect(logActivity).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({ action: 'CREATE_CHRISTMAS_ORNAMENT' })
    );
  });
});
