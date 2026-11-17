import { logActivity } from '@/lib/audit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildExchangeGiftState,
  drawChristmasExchangeGiftPartner,
  saveChristmasExchangeGiftDeliveryAddress,
} from '../../apps/web/src/app/api/christmas-tree/_lib';

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

  it('includes the complete assignment roster only for Christmas Tree managers', () => {
    const assignments = [
      {
        giver_user_id: 'admin-1',
        recipient_user_id: 'employee-1',
        revealed_at: '2026-11-17T00:00:00Z',
      },
      {
        giver_user_id: 'employee-1',
        recipient_user_id: 'admin-1',
        revealed_at: null,
      },
    ];
    const input = {
      assignments,
      participantUserIds: ['admin-1', 'employee-1'],
      userId: 'admin-1',
      hasOrnament: true,
      nameByUserId: new Map([
        ['admin-1', 'Admin User'],
        ['employee-1', 'Sample Employee'],
      ]),
      deliveryDetailsByUserId: new Map([
        [
          'employee-1',
          {
            deliveryAddress: '123 Sample Street, Cebu City',
            phoneNumber: '+63 917 123 4567',
          },
        ],
      ]),
    };

    const managerState = buildExchangeGiftState({ ...input, canManage: true });
    expect(managerState.adminRoster).toEqual([
      expect.objectContaining({
        name: 'Admin User',
        recipientName: 'Sample Employee',
        hasSelected: true,
        hasDeliveryAddress: false,
      }),
      expect.objectContaining({
        name: 'Sample Employee',
        recipientUserId: null,
        recipientName: null,
        hasSelected: false,
        hasDeliveryAddress: true,
        hasPhoneNumber: true,
      }),
    ]);

    const employeeState = buildExchangeGiftState({
      ...input,
      userId: 'employee-1',
      canManage: false,
    });
    expect(employeeState.adminRoster).toBeNull();
    expect(employeeState.recipient).toBeNull();
  });

  it('reveals the assigned recipient address only after the caller has drawn', () => {
    const state = buildExchangeGiftState({
      assignments: [
        {
          giver_user_id: 'employee-1',
          recipient_user_id: 'employee-2',
          revealed_at: '2026-11-17T00:00:00Z',
        },
      ],
      participantUserIds: ['employee-1', 'employee-2'],
      userId: 'employee-1',
      hasOrnament: true,
      nameByUserId: new Map([['employee-2', 'Recipient User']]),
      deliveryDetailsByUserId: new Map([
        [
          'employee-2',
          {
            deliveryAddress: '456 Recipient Avenue, Davao City',
            phoneNumber: '+63 918 765 4321',
          },
        ],
      ]),
      canManage: false,
    });

    expect(state.recipient).toEqual({
      userId: 'employee-2',
      name: 'Recipient User',
      deliveryAddress: '456 Recipient Avenue, Davao City',
      phoneNumber: '+63 918 765 4321',
    });
    expect(state.deliveryAddress).toBeNull();
  });

  it('saves an address only for a current Christmas ball owner and audits without address PII', async () => {
    const eventQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: activeEvent, error: null })),
    };
    eventQuery.select.mockReturnValue(eventQuery);
    eventQuery.eq.mockReturnValue(eventQuery);
    eventQuery.is.mockReturnValue(eventQuery);
    const ornamentQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: { id: 'ornament-1' }, error: null })),
    };
    ornamentQuery.select.mockReturnValue(ornamentQuery);
    ornamentQuery.eq.mockReturnValue(ornamentQuery);
    ornamentQuery.is.mockReturnValue(ornamentQuery);
    const upsert = vi.fn(async () => ({ error: null }));
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'christmas_tree_events') return eventQuery;
        if (table === 'christmas_ornaments') return ornamentQuery;
        return { upsert };
      }),
    } as never;

    await saveChristmasExchangeGiftDeliveryAddress(
      client,
      'employee-1',
      '789 Private Road, Manila',
      '+63 919 111 2233'
    );

    expect(upsert).toHaveBeenCalledWith(
      {
        event_id: 'event-1',
        user_id: 'employee-1',
        delivery_address: '789 Private Road, Manila',
        phone_number: '+63 919 111 2233',
      },
      { onConflict: 'event_id,user_id' }
    );
    expect(logActivity).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        action: 'SAVE_CHRISTMAS_EXCHANGE_GIFT_DELIVERY_ADDRESS',
        metadata: { eventId: 'event-1', hasDeliveryAddress: true, hasPhoneNumber: true },
      })
    );
  });
});
