import { logActivity } from '@/lib/audit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { drawChristmasExchangeGiftPartner } from '../../apps/web/src/app/api/christmas-tree/_lib';

vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));

const activeEvent = {
  id: 'event-1',
  title: 'SN Christmas Wish Tree 2026',
  timezone: 'Asia/Manila',
  october_opens_at: '2026-10-01T00:00:00Z',
  october_closes_at: '2026-10-31T23:59:59Z',
  november_opens_at: '2026-11-01T00:00:00Z',
  november_closes_at: '2026-11-30T23:59:59Z',
  december_opens_at: '2026-12-01T00:00:00Z',
  december_closes_at: '2026-12-31T23:59:59Z',
  visible_until: '2027-01-15T23:59:59Z',
  garland_manually_enabled: false,
  lights_manually_enabled: false,
  star_manually_enabled: false,
};

function createClient(rpcError: { message: string } | null = null) {
  const eventQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: activeEvent, error: null })),
  };
  eventQuery.select.mockReturnValue(eventQuery);
  eventQuery.eq.mockReturnValue(eventQuery);
  eventQuery.is.mockReturnValue(eventQuery);
  const rpc = vi.fn(async () => ({ data: null, error: rpcError }));
  return {
    client: {
      from: vi.fn(() => eventQuery),
      rpc,
    } as never,
    rpc,
  };
}

describe('Christmas exchange gift draw', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates the random draw to the atomic database function and audits the reveal', async () => {
    const { client, rpc } = createClient();

    await drawChristmasExchangeGiftPartner(client, 'employee-1');

    expect(rpc).toHaveBeenCalledWith('draw_christmas_exchange_gift_partner', {
      p_event_id: 'event-1',
      p_giver_user_id: 'employee-1',
    });
    expect(logActivity).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        userId: 'employee-1',
        action: 'REVEAL_CHRISTMAS_EXCHANGE_GIFT_PARTNER',
        tableName: 'christmas_tree_events',
        recordId: 'event-1',
        metadata: { eventId: 'event-1' },
      })
    );
  });

  it('surfaces a finalized-roster conflict without writing a misleading audit event', async () => {
    const { client } = createClient({
      message: 'The exchange gift draw is already set and you were not in its participant list',
    });

    await expect(drawChristmasExchangeGiftPartner(client, 'late-employee')).rejects.toMatchObject({
      status: 409,
      message: 'The exchange gift draw is already set and you were not in its participant list',
    });
    expect(logActivity).not.toHaveBeenCalled();
  });
});
