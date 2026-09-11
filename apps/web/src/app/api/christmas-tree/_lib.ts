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
const PLACEMENT_COLUMNS = [
  [50, 16],
  [37, 28],
  [63, 28],
  [27, 40],
  [46, 40],
  [68, 40],
  [20, 52],
  [36, 52],
  [54, 52],
  [75, 52],
  [15, 64],
  [29, 64],
  [44, 64],
  [60, 64],
  [82, 64],
  [10, 76],
  [23, 76],
  [37, 76],
  [51, 76],
  [66, 76],
  [79, 76],
  [90, 76],
] as const;

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

  const [
    { data: ornaments, error: ornamentsError },
    { data: wishes, error: wishesError },
    { data: state, error: stateError },
  ] = await Promise.all([
    adminClient
      .from('christmas_ornaments')
      .select('id, user_id, asset_type, position_x, position_y')
      .eq('event_id', event.id)
      .is('deleted_at', null),
    adminClient
      .from('christmas_wishes')
      .select('ornament_id, category, item_number, content, submitted_at')
      .is('deleted_at', null),
    adminClient.rpc('get_christmas_tree_decoration_state', { p_event_id: event.id }),
  ]);

  if (ornamentsError || wishesError || stateError)
    throw new Error('Failed to load Christmas Tree data');

  const eventOrnaments = (ornaments ?? []) as Array<OrnamentRow>;
  const [nameByUserId, wishesByOrnament] = await Promise.all([
    getOrnamentOwnerNames(adminClient, eventOrnaments),
    Promise.resolve(
      getVisibleWishesByOrnament(event, eventOrnaments, (wishes ?? []) as Array<WishRow>)
    ),
  ]);

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
  assetType: string
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

  const position = PLACEMENT_COLUMNS.find(
    ([x, y]) =>
      !(existingOrnaments ?? []).some(
        (ornament) =>
          Math.hypot(Number(ornament.position_x) - x, Number(ornament.position_y) - y) <
          ORNAMENT_RADIUS_PCT * 2
      )
  );
  if (!position)
    throw new ChristmasTreeRequestError('The Christmas Tree has reached capacity', 409);

  const { data: ornament, error: insertError } = await adminClient
    .from('christmas_ornaments')
    .insert({
      event_id: event.id,
      user_id: userId,
      asset_type: assetType,
      position_x: position[0],
      position_y: position[1],
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
    metadata: { eventId: event.id, assetType },
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
