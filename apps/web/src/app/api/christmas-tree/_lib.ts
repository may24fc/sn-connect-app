import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export type ChristmasTreeAdminClient = ReturnType<typeof createSupabaseAdminClient>;

type ChristmasEventRow = {
  id: string;
  title: string;
  timezone: string;
  october_opens_at: string;
  october_closes_at: string;
  november_opens_at: string;
  november_closes_at: string;
  december_opens_at: string;
  december_closes_at: string;
  visible_until: string;
};

type OrnamentRow = {
  id: string;
  user_id: string;
  asset_type: string;
  position_x: number;
  position_y: number;
};

type WishRow = {
  ornament_id: string;
  category: 'personal' | 'for_others' | 'for_sn';
  item_number: number;
  content: string;
  submitted_at: string;
};

const ORNAMENT_RADIUS_PCT = 5;
export async function getChristmasTreeAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { user: error ? null : user };
}

export function getChristmasTreeAdminClient(): ChristmasTreeAdminClient {
  return createSupabaseAdminClient();
}

export async function getActiveChristmasEvent(
  adminClient: ChristmasTreeAdminClient
): Promise<ChristmasEventRow | null> {
  const { data, error } = await adminClient
    .from('christmas_tree_events')
    .select(
      'id, title, timezone, october_opens_at, october_closes_at, november_opens_at, november_closes_at, december_opens_at, december_closes_at, visible_until'
    )
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error('Failed to load the active Christmas Tree event');
  return data as ChristmasEventRow | null;
}

function categoryState(event: ChristmasEventRow, category: WishRow['category']) {
  const now = Date.now();
  const windows: Record<
    WishRow['category'],
    { opensAt: string; closesAt: string; lockedTeaser: string }
  > = {
    personal: {
      opensAt: event.october_opens_at,
      closesAt: event.october_closes_at,
      lockedTeaser: 'Locked until October 1',
    },
    for_others: {
      opensAt: event.november_opens_at,
      closesAt: event.november_closes_at,
      lockedTeaser: 'Locked until November 1',
    },
    for_sn: {
      opensAt: event.december_opens_at,
      closesAt: event.december_closes_at,
      lockedTeaser: 'Locked until December 1',
    },
  };
  const window = windows[category];
  const opensAt = new Date(window.opensAt).getTime();
  const closesAt = new Date(window.closesAt).getTime();

  return {
    isUnlocked: now >= opensAt,
    isEditable: now >= opensAt && now <= closesAt,
    teaser:
      now < opensAt ? window.lockedTeaser : now > closesAt ? 'Submission window closed' : null,
    opensAt: window.opensAt,
    closesAt: window.closesAt,
  };
}

export async function buildChristmasTreeSnapshot(
  adminClient: ChristmasTreeAdminClient,
  userId: string
) {
  const event = await getActiveChristmasEvent(adminClient);
  if (!event) throw new Error('No active Christmas Tree event is configured');

  const [{ data: ornaments, error: ornamentsError }, { data: state, error: stateError }] =
    await Promise.all([
      adminClient
        .from('christmas_ornaments')
        .select('id, user_id, asset_type, position_x, position_y')
        .eq('event_id', event.id)
        .is('deleted_at', null),
      adminClient.rpc('get_christmas_tree_decoration_state', { p_event_id: event.id }),
    ]);

  if (ornamentsError || stateError) throw new Error('Failed to load Christmas Tree data');

  const eventOrnaments = (ornaments ?? []) as Array<OrnamentRow>;
  const ornamentIds = eventOrnaments.map((ornament) => ornament.id);
  const wishesRequest = ornamentIds.length
    ? adminClient
        .from('christmas_wishes')
        .select('ornament_id, category, item_number, content, submitted_at')
        .in('ornament_id', ornamentIds)
        .is('deleted_at', null)
    : Promise.resolve({ data: [] as Array<WishRow>, error: null });
  const [nameByUserId, { data: wishes, error: wishesError }] = await Promise.all([
    getOrnamentOwnerNames(adminClient, eventOrnaments),
    wishesRequest,
  ]);
  if (wishesError) throw new Error('Failed to load Christmas Tree wishes');
  const wishesByOrnament = getVisibleWishesByOrnament(
    event,
    eventOrnaments,
    (wishes ?? []) as Array<WishRow>
  );

  const mine = eventOrnaments.find((ornament) => ornament.user_id === userId) ?? null;
  return {
    event: {
      id: event.id,
      title: event.title,
      timezone: event.timezone,
      visibleUntil: event.visible_until,
      categories: Object.fromEntries(
        (['personal', 'for_others', 'for_sn'] as const).map((category) => [
          category,
          categoryState(event, category),
        ])
      ),
    },
    decoration: state?.[0] ?? null,
    myOrnament: mine,
    ornaments: eventOrnaments.map((ornament) => ({
      id: ornament.id,
      ownerName: nameByUserId.get(ornament.user_id) ?? 'Team member',
      assetType: ornament.asset_type,
      positionX: ornament.position_x,
      positionY: ornament.position_y,
      wishes: (wishesByOrnament.get(ornament.id) ?? []).sort(
        (left, right) => left.item_number - right.item_number
      ),
    })),
  };
}

export async function placeChristmasOrnament(
  adminClient: ChristmasTreeAdminClient,
  userId: string,
  assetType: string,
  positionX: number,
  positionY: number
) {
  const event = await getActiveChristmasEvent(adminClient);
  if (!event) throw new Error('No active Christmas Tree event is configured');

  const { data: existing, error: existingError } = await adminClient
    .from('christmas_ornaments')
    .select('id')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (existingError) throw new Error('Failed to check existing ornament');
  if (existing)
    throw new ChristmasTreeRequestError('You already have an ornament on this tree', 409);

  const { data: existingOrnaments, error: positionsError } = await adminClient
    .from('christmas_ornaments')
    .select('position_x, position_y')
    .eq('event_id', event.id)
    .is('deleted_at', null);
  if (positionsError) throw new Error('Failed to allocate ornament position');

  if (!isChristmasTreePosition(positionX, positionY)) {
    throw new ChristmasTreeRequestError('Drop your Christmas ball on the tree branches', 400);
  }
  if (
    (existingOrnaments ?? []).some(
      (ornament) =>
        Math.hypot(
          Number(ornament.position_x) - positionX,
          Number(ornament.position_y) - positionY
        ) <
        ORNAMENT_RADIUS_PCT * 2
    )
  ) {
    throw new ChristmasTreeRequestError(
      'Choose an open spot away from another Christmas ball',
      409
    );
  }

  const { data: ornament, error: insertError } = await adminClient
    .from('christmas_ornaments')
    .insert({
      event_id: event.id,
      user_id: userId,
      asset_type: assetType,
      position_x: positionX,
      position_y: positionY,
      created_by: userId,
    })
    .select('id')
    .single();
  if (insertError || !ornament) {
    if (insertError?.code === '23505')
      throw new ChristmasTreeRequestError('You already have an ornament on this tree', 409);
    throw new Error('Failed to place ornament');
  }

  logActivity(adminClient, {
    userId,
    action: 'CREATE_CHRISTMAS_ORNAMENT',
    tableName: 'christmas_ornaments',
    recordId: ornament.id,
    metadata: { eventId: event.id, assetType, positionX, positionY },
  });
}

export async function moveChristmasOrnament(
  adminClient: ChristmasTreeAdminClient,
  userId: string,
  positionX: number,
  positionY: number
) {
  const event = await getActiveChristmasEvent(adminClient);
  if (!event) throw new Error('No active Christmas Tree event is configured');

  const { data: ornament, error: ornamentError } = await adminClient
    .from('christmas_ornaments')
    .select('id')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (ornamentError || !ornament)
    throw new ChristmasTreeRequestError('Place a Christmas ball before moving it', 404);

  const { data: otherOrnaments, error: positionsError } = await adminClient
    .from('christmas_ornaments')
    .select('position_x, position_y')
    .eq('event_id', event.id)
    .neq('id', ornament.id)
    .is('deleted_at', null);
  if (positionsError) throw new Error('Failed to validate the new ornament position');

  if (!isChristmasTreePosition(positionX, positionY)) {
    throw new ChristmasTreeRequestError('Keep your Christmas ball on the tree branches', 400);
  }
  if (
    (otherOrnaments ?? []).some(
      (other) =>
        Math.hypot(Number(other.position_x) - positionX, Number(other.position_y) - positionY) <
        ORNAMENT_RADIUS_PCT * 2
    )
  ) {
    throw new ChristmasTreeRequestError(
      'Choose an open spot away from another Christmas ball',
      409
    );
  }

  const { error: updateError } = await adminClient
    .from('christmas_ornaments')
    .update({ position_x: positionX, position_y: positionY })
    .eq('id', ornament.id);
  if (updateError) throw new Error('Failed to move Christmas ball');

  logActivity(adminClient, {
    userId,
    action: 'UPDATE_CHRISTMAS_ORNAMENT_POSITION',
    tableName: 'christmas_ornaments',
    recordId: ornament.id,
    metadata: { eventId: event.id, positionX, positionY },
  });
}

export async function upsertChristmasWish(
  adminClient: ChristmasTreeAdminClient,
  userId: string,
  category: WishRow['category'],
  itemNumber: number,
  content: string
) {
  const event = await getActiveChristmasEvent(adminClient);
  if (!event) throw new Error('No active Christmas Tree event is configured');
  const { data: ornament, error: ornamentError } = await adminClient
    .from('christmas_ornaments')
    .select('id')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (ornamentError || !ornament)
    throw new ChristmasTreeRequestError('Place an ornament before submitting a wish', 400);

  const { data: wish, error } = await adminClient
    .from('christmas_wishes')
    .upsert(
      { ornament_id: ornament.id, category, item_number: itemNumber, content, created_by: userId },
      { onConflict: 'ornament_id,category,item_number' }
    )
    .select('id')
    .single();
  if (error || !wish) {
    if (error?.message.includes('unavailable outside'))
      throw new ChristmasTreeRequestError(error.message, 403);
    throw new Error('Failed to save Christmas wish');
  }

  logActivity(adminClient, {
    userId,
    action: 'UPDATE_CHRISTMAS_WISH',
    tableName: 'christmas_wishes',
    recordId: wish.id,
    metadata: { category, eventId: event.id, itemNumber, ornamentId: ornament.id },
  });
}

export async function deleteChristmasWish(
  adminClient: ChristmasTreeAdminClient,
  userId: string,
  category: WishRow['category'],
  itemNumber: number
) {
  const event = await getActiveChristmasEvent(adminClient);
  if (!event) throw new Error('No active Christmas Tree event is configured');
  if (!categoryState(event, category).isEditable) {
    throw new ChristmasTreeRequestError('This wish can no longer be changed', 403);
  }

  const { data: ornament, error: ornamentError } = await adminClient
    .from('christmas_ornaments')
    .select('id')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (ornamentError || !ornament)
    throw new ChristmasTreeRequestError('Place an ornament before removing a wish', 400);

  const { data: wish, error } = await adminClient
    .from('christmas_wishes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('ornament_id', ornament.id)
    .eq('category', category)
    .eq('item_number', itemNumber)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) throw new Error('Failed to remove Christmas wish');
  if (!wish) throw new ChristmasTreeRequestError('This wish has already been removed', 404);

  logActivity(adminClient, {
    userId,
    action: 'DELETE_CHRISTMAS_WISH',
    tableName: 'christmas_wishes',
    recordId: wish.id,
    metadata: { category, eventId: event.id, itemNumber, ornamentId: ornament.id },
  });
}

export async function deleteChristmasOrnament(
  adminClient: ChristmasTreeAdminClient,
  userId: string
) {
  const event = await getActiveChristmasEvent(adminClient);
  if (!event) throw new Error('No active Christmas Tree event is configured');

  const { data: ornament, error } = await adminClient
    .from('christmas_ornaments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) throw new Error('Failed to remove Christmas ball');
  if (!ornament)
    throw new ChristmasTreeRequestError('Your Christmas ball has already been removed', 404);

  logActivity(adminClient, {
    userId,
    action: 'DELETE_CHRISTMAS_ORNAMENT',
    tableName: 'christmas_ornaments',
    recordId: ornament.id,
    metadata: { eventId: event.id },
  });
}

export class ChristmasTreeRequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function getOrnamentOwnerNames(
  adminClient: ChristmasTreeAdminClient,
  ornaments: Array<OrnamentRow>
): Promise<Map<string, string>> {
  const userIds = [...new Set(ornaments.map((ornament) => ornament.user_id))];
  if (userIds.length === 0) return new Map();

  const { data: employees, error } = await adminClient
    .from('employees')
    .select('user_id, first_name, last_name')
    .in('user_id', userIds)
    .is('deleted_at', null);
  if (error) throw new Error('Failed to load Christmas Tree member names');

  return new Map(
    (employees ?? []).map((employee) => [
      employee.user_id,
      [employee.first_name, employee.last_name].filter(Boolean).join(' ') || 'Team member',
    ])
  );
}

function getVisibleWishesByOrnament(
  event: ChristmasEventRow,
  ornaments: Array<OrnamentRow>,
  wishes: Array<WishRow>
): Map<string, Array<WishRow>> {
  const ornamentIds = new Set(ornaments.map((ornament) => ornament.id));
  return wishes
    .filter((wish) => isVisibleWish(event, ornamentIds, wish))
    .reduce((result, wish) => {
      result.set(wish.ornament_id, [...(result.get(wish.ornament_id) ?? []), wish]);
      return result;
    }, new Map<string, Array<WishRow>>());
}

function isVisibleWish(event: ChristmasEventRow, ornamentIds: Set<string>, wish: WishRow): boolean {
  return ornamentIds.has(wish.ornament_id) && categoryState(event, wish.category).isUnlocked;
}

function isChristmasTreePosition(positionX: number, positionY: number): boolean {
  const horizontalSpread = (positionY - 7) * 0.57;
  return (
    positionY >= 10 &&
    positionY <= 80 &&
    positionX >= 50 - horizontalSpread &&
    positionX <= 50 + horizontalSpread
  );
}
