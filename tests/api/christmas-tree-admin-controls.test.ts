import { logActivity } from '@/lib/audit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canManageChristmasTree,
  deleteChristmasOrnament,
  enableChristmasDecoration,
  saveChristmasStrand,
} from '../../apps/web/src/app/api/christmas-tree/_lib';

vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));

const activeEvent = {
  id: 'event-1',
  title: 'SN Christmas Wish Tree 2026',
  timezone: 'Asia/Manila',
  october_opens_at: '2026-10-01T00:00:00Z',
  october_closes_at: '2026-10-20T23:59:59Z',
  november_opens_at: '2026-11-01T00:00:00Z',
  november_closes_at: '2026-11-20T23:59:59Z',
  december_opens_at: '2026-12-01T00:00:00Z',
  december_closes_at: '2026-12-20T23:59:59Z',
  visible_until: '2027-01-15T23:59:59Z',
};

function terminalQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
  };
  return query;
}

function createOrnamentAdminClient(ownerUserId = 'employee-1') {
  const eventQuery = terminalQuery({ data: activeEvent, error: null });
  const targetQuery = terminalQuery({
    data: { id: '11111111-1111-4111-8111-111111111111', user_id: ownerUserId },
    error: null,
  });
  const updateQuery = terminalQuery({
    data: { id: '11111111-1111-4111-8111-111111111111' },
    error: null,
  });
  const update = vi.fn(() => updateQuery);
  let ornamentCallCount = 0;
  const from = vi.fn((table: string) => {
    if (table === 'christmas_tree_events') return eventQuery;
    if (table === 'christmas_ornaments') {
      ornamentCallCount += 1;
      return ornamentCallCount === 1 ? targetQuery : { update };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  return { adminClient: { from } as never, update };
}

function createDecorationAdminClient() {
  const eventQuery = terminalQuery({ data: activeEvent, error: null });
  const updateQuery = terminalQuery({ data: { id: activeEvent.id }, error: null });
  const update = vi.fn(() => updateQuery);
  let eventCallCount = 0;
  const from = vi.fn((table: string) => {
    if (table !== 'christmas_tree_events') throw new Error(`Unexpected table: ${table}`);
    eventCallCount += 1;
    return eventCallCount === 1 ? eventQuery : { update };
  });
  return { adminClient: { from } as never, update };
}

function createStrandAdminClient() {
  const eventQuery = terminalQuery({ data: activeEvent, error: null });
  const updateQuery = terminalQuery({ data: { id: activeEvent.id }, error: null });
  const strandQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: { id: 'strand-1' }, error: null })),
    single: vi.fn(async () => ({ data: { id: 'strand-1' }, error: null })),
  };
  strandQuery.select.mockReturnValue(strandQuery);
  strandQuery.eq.mockReturnValue(strandQuery);
  const insert = vi.fn(() => strandQuery);
  const updateStrand = vi.fn(() => strandQuery);
  const updateEvent = vi.fn(() => updateQuery);
  let eventCalls = 0;
  const from = vi.fn((table: string) => {
    if (table === 'christmas_tree_strands') return { insert, update: updateStrand };
    if (table === 'christmas_tree_events') {
      eventCalls += 1;
      return eventCalls === 1 ? eventQuery : { update: updateEvent };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  return { adminClient: { from } as never, insert, updateStrand, updateEvent, strandQuery };
}

describe('Christmas Tree admin controls', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recognizes admin and super-admin roles as tree managers', () => {
    expect(canManageChristmasTree('admin')).toBe(true);
    expect(canManageChristmasTree('super_admin')).toBe(true);
    expect(canManageChristmasTree('employee')).toBe(false);
    expect(canManageChristmasTree(null)).toBe(false);
  });

  it('prevents a regular user from removing another user’s ornament', async () => {
    const { adminClient, update } = createOrnamentAdminClient();

    await expect(
      deleteChristmasOrnament(
        adminClient,
        'employee-2',
        '11111111-1111-4111-8111-111111111111',
        false
      )
    ).rejects.toMatchObject({ status: 403 });
    expect(update).not.toHaveBeenCalled();
  });

  it('allows an authorized manager to soft-delete another user’s ornament', async () => {
    const { adminClient, update } = createOrnamentAdminClient();

    await deleteChristmasOrnament(
      adminClient,
      'admin-1',
      '11111111-1111-4111-8111-111111111111',
      true
    );

    expect(update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(logActivity).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        userId: 'admin-1',
        metadata: expect.objectContaining({ removedByAdmin: true }),
      })
    );
  });

  it('allows an authorized manager to enable a shared decoration', async () => {
    const { adminClient, update } = createDecorationAdminClient();

    await enableChristmasDecoration(adminClient, 'super-admin-1', 'lights', true);

    expect(update).toHaveBeenCalledWith({ lights_manually_enabled: true });
    expect(logActivity).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({ metadata: { decoration: 'lights' } })
    );
  });

  it('rejects decoration changes without manager permission', async () => {
    const { adminClient, update } = createDecorationAdminClient();

    await expect(
      enableChristmasDecoration(adminClient, 'employee-1', 'star', false)
    ).rejects.toMatchObject({ status: 403 });
    expect(update).not.toHaveBeenCalled();
  });

  it('creates separate rows for every new Garland or Lights strand', async () => {
    const { adminClient, insert, updateEvent } = createStrandAdminClient();
    const geometry = { startX: 30, startY: 50, endX: 70, endY: 50 };

    await saveChristmasStrand(adminClient, 'admin-1', 'garland', geometry, true);

    expect(insert).toHaveBeenCalledWith({
      event_id: activeEvent.id,
      kind: 'garland',
      created_by: 'admin-1',
      start_x: 30,
      start_y: 50,
      end_x: 70,
      end_y: 50,
    });
    expect(updateEvent).toHaveBeenCalledWith({ garland_manually_enabled: true });
  });

  it('moves only the specified saved strand', async () => {
    const { adminClient, insert, updateStrand, strandQuery } = createStrandAdminClient();

    await saveChristmasStrand(
      adminClient,
      'super-admin-1',
      'lights',
      { startX: 25, startY: 60, endX: 75, endY: 62 },
      true,
      'strand-1'
    );

    expect(insert).not.toHaveBeenCalled();
    expect(updateStrand).toHaveBeenCalledWith({ start_x: 25, start_y: 60, end_x: 75, end_y: 62 });
    expect(strandQuery.eq).toHaveBeenCalledWith('id', 'strand-1');
    expect(strandQuery.eq).toHaveBeenCalledWith('event_id', activeEvent.id);
    expect(strandQuery.eq).toHaveBeenCalledWith('kind', 'lights');
  });
});
