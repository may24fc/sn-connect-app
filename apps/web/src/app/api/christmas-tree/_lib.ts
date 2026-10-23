import { logActivity } from '@/lib/audit';
import { getActiveUserRole } from '@/lib/auth/active-role';
import type { KnownDbRole } from '@/lib/auth/role';
import type { ChristmasStrandGeometry } from '@/lib/schemas/christmas-tree.schema';
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
  garland_manually_enabled: boolean;
  lights_manually_enabled: boolean;
  star_manually_enabled: boolean;
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
  link_url: string | null;
  submitted_at: string;
};

const ORNAMENT_RADIUS_PCT = 5;
export async function getChristmasTreeAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { user: null, role: null };
  return { user, role: await getActiveUserRole(user.id) };
}

export function canManageChristmasTree(role: KnownDbRole | null): boolean {
  return role === 'admin' || role === 'super_admin';
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
      'id, title, timezone, october_opens_at, october_closes_at, november_opens_at, november_closes_at, december_opens_at, december_closes_at, visible_until, garland_manually_enabled, lights_manually_enabled, star_manually_enabled'
    )
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error('Failed to load the active Christmas Tree event');
  return data as ChristmasEventRow | null;
}

function categoryState(event: ChristmasEventRow, category: WishRow['category']) {
  const windows: Record<WishRow['category'], { opensAt: string; closesAt: string }> = {
    personal: {
      opensAt: event.october_opens_at,
      closesAt: event.october_closes_at,
    },
    for_others: {
      opensAt: event.november_opens_at,
      closesAt: event.november_closes_at,
    },
    for_sn: {
      opensAt: event.december_opens_at,
      closesAt: event.december_closes_at,
    },
  };
  const window = windows[category];

  return {
    isUnlocked: true,
    isEditable: true,
    teaser: null,
    opensAt: window.opensAt,
    closesAt: window.closesAt,
  };
}

export async function buildChristmasTreeSnapshot(
  adminClient: ChristmasTreeAdminClient,
  userId: string,
  role: KnownDbRole | null = null
) {
  const event = await getActiveChristmasEvent(adminClient);
  if (!event) throw new Error('No active Christmas Tree event is configured');

  const [
    { data: ornaments, error: ornamentsError },
    { data: state, error: stateError },
    { data: strands, error: strandsError },
  ] = await Promise.all([
    adminClient
      .from('christmas_ornaments')
      .select('id, user_id, asset_type, position_x, position_y')
      .eq('event_id', event.id)
      .is('deleted_at', null),
    adminClient.rpc('get_christmas_tree_decoration_state', { p_event_id: event.id }),
    adminClient
      .from('christmas_tree_strands')
      .select('id, kind, start_x, start_y, end_x, end_y')
      .eq('event_id', event.id)
      .order('created_at', { ascending: true }),
  ]);

  if (ornamentsError || stateError || strandsError)
    throw new Error('Failed to load Christmas Tree data');

  const eventOrnaments = (ornaments ?? []) as Array<OrnamentRow>;
  const ornamentIds = eventOrnaments.map((ornament) => ornament.id);
  const wishesRequest = ornamentIds.length
    ? adminClient
        .from('christmas_wishes')
        .select('ornament_id, category, item_number, content, link_url, submitted_at')
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
    manualDecorations: {
      garland: event.garland_manually_enabled,
      lights: event.lights_manually_enabled,
      star: event.star_manually_enabled,
    },
    strands: (strands ?? []).map((strand) => ({
      id: strand.id,
      kind: strand.kind as 'garland' | 'lights',
      geometry: {
        startX: Number(strand.start_x),
        startY: Number(strand.start_y),
        endX: Number(strand.end_x),
        endY: Number(strand.end_y),
      },
    })),
    permissions: { canManage: canManageChristmasTree(role) },
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
  content: string,
  linkUrl: string | null
) {
  const event = await getActiveChristmasEvent(adminClient);
  if (!event) throw new Error('No active Christmas Tree event is configured');
  const state = categoryState(event, category);
  if (!state.isEditable) {
    throw new ChristmasTreeRequestError(
      state.teaser ?? 'This wish cannot be changed right now',
      403
    );
  }
  const { data: ornament, error: ornamentError } = await adminClient
    .from('christmas_ornaments')
    .select('id')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (ornamentError || !ornament)
    throw new ChristmasTreeRequestError('Place an ornament before submitting a wish', 400);

  const wishValues = {
    content,
    link_url: linkUrl,
    created_by: userId,
  };
  // A column-only upsert cannot target the partial unique index for active wishes.
  // Update first, then insert only when no active row exists to preserve soft deletes.
  const updateActiveWish = () =>
    adminClient
      .from('christmas_wishes')
      .update(wishValues)
      .eq('ornament_id', ornament.id)
      .eq('category', category)
      .eq('item_number', itemNumber)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

  let { data: wish, error } = await updateActiveWish();
  if (error) throwChristmasWishWriteError(error);

  if (!wish) {
    const insertResult = await adminClient
      .from('christmas_wishes')
      .insert({
        ornament_id: ornament.id,
        category,
        item_number: itemNumber,
        ...wishValues,
      })
      .select('id')
      .single();
    wish = insertResult.data;
    error = insertResult.error;

    // A concurrent first save can win after the update check. Retry as an update.
    if (error?.code === '23505') {
      const retryResult = await updateActiveWish();
      wish = retryResult.data;
      error = retryResult.error;
    }
  }

  if (error || !wish) throwChristmasWishWriteError(error);

  logActivity(adminClient, {
    userId,
    action: 'UPDATE_CHRISTMAS_WISH',
    tableName: 'christmas_wishes',
    recordId: wish.id,
    metadata: {
      category,
      eventId: event.id,
      itemNumber,
      ornamentId: ornament.id,
      hasLink: Boolean(linkUrl),
    },
  });
}

function throwChristmasWishWriteError(error: { message: string } | null): never {
  if (error?.message.includes('unavailable outside')) {
    throw new ChristmasTreeRequestError(error.message, 403);
  }
  throw new Error('Failed to save Christmas wish');
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
  userId: string,
  targetOrnamentId?: string,
  canManage = false
) {
  const event = await getActiveChristmasEvent(adminClient);
  if (!event) throw new Error('No active Christmas Tree event is configured');

  const targetQuery = adminClient
    .from('christmas_ornaments')
    .select('id, user_id')
    .eq('event_id', event.id)
    .is('deleted_at', null);
  const { data: target, error: targetError } = targetOrnamentId
    ? await targetQuery.eq('id', targetOrnamentId).maybeSingle()
    : await targetQuery.eq('user_id', userId).maybeSingle();
  if (targetError) throw new Error('Failed to find Christmas ball');
  if (!target)
    throw new ChristmasTreeRequestError('This Christmas ball has already been removed', 404);
  if (target.user_id !== userId && !canManage) {
    throw new ChristmasTreeRequestError(
      'Only admins can remove another user’s Christmas ball',
      403
    );
  }

  const { data: ornament, error } = await adminClient
    .from('christmas_ornaments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('event_id', event.id)
    .eq('id', target.id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) throw new Error('Failed to remove Christmas ball');
  if (!ornament)
    throw new ChristmasTreeRequestError('This Christmas ball has already been removed', 404);

  logActivity(adminClient, {
    userId,
    action: 'DELETE_CHRISTMAS_ORNAMENT',
    tableName: 'christmas_ornaments',
    recordId: ornament.id,
    metadata: {
      eventId: event.id,
      ownerUserId: target.user_id,
      removedByAdmin: target.user_id !== userId,
    },
  });
}

export async function enableChristmasDecoration(
  adminClient: ChristmasTreeAdminClient,
  userId: string,
  decoration: 'garland' | 'lights' | 'star',
  canManage: boolean
) {
  if (!canManage) {
    throw new ChristmasTreeRequestError('Only admins can manage Christmas Tree decorations', 403);
  }
  const event = await getActiveChristmasEvent(adminClient);
  if (!event) throw new Error('No active Christmas Tree event is configured');

  const column = `${decoration}_manually_enabled` as const;
  const { data: updatedEvent, error } = await adminClient
    .from('christmas_tree_events')
    .update({ [column]: true })
    .eq('id', event.id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) throw new Error('Failed to add Christmas Tree decoration');
  if (!updatedEvent) throw new ChristmasTreeRequestError('Christmas Tree event not found', 404);

  logActivity(adminClient, {
    userId,
    action: 'ENABLE_CHRISTMAS_TREE_DECORATION',
    tableName: 'christmas_tree_events',
    recordId: event.id,
    metadata: { decoration },
  });
}

export async function removeChristmasDecoration(
  adminClient: ChristmasTreeAdminClient,
  userId: string,
  target: { decoration: 'star' } | { strandId: string },
  canManage: boolean
) {
  if (!canManage) {
    throw new ChristmasTreeRequestError('Only admins can manage Christmas Tree decorations', 403);
  }
  const event = await getActiveChristmasEvent(adminClient);
  if (!event) throw new Error('No active Christmas Tree event is configured');

  if ('decoration' in target) {
    const { data, error } = await adminClient
      .from('christmas_tree_events')
      .update({ star_manually_enabled: false })
      .eq('id', event.id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();
    if (error) throw new Error('Failed to remove Christmas Tree star');
    if (!data) throw new ChristmasTreeRequestError('Christmas Tree event not found', 404);
    logActivity(adminClient, {
      userId,
      action: 'REMOVE_CHRISTMAS_TREE_DECORATION',
      tableName: 'christmas_tree_events',
      recordId: event.id,
      metadata: { decoration: 'star' },
    });
    return;
  }

  const { data: removed, error } = await adminClient
    .from('christmas_tree_strands')
    .delete()
    .eq('id', target.strandId)
    .eq('event_id', event.id)
    .select('id, kind')
    .maybeSingle();
  if (error) throw new Error('Failed to remove Christmas Tree strand');
  if (!removed) throw new ChristmasTreeRequestError('Christmas Tree strand not found', 404);

  const { count, error: countError } = await adminClient
    .from('christmas_tree_strands')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('kind', removed.kind);
  if (countError) throw new Error('Failed to check remaining Christmas Tree strands');
  if (count === 0) {
    const column = `${removed.kind}_manually_enabled` as
      | 'garland_manually_enabled'
      | 'lights_manually_enabled';
    const { error: eventError } = await adminClient
      .from('christmas_tree_events')
      .update({ [column]: false })
      .eq('id', event.id);
    if (eventError) throw new Error('Failed to update Christmas Tree decoration');
  }
  logActivity(adminClient, {
    userId,
    action: 'REMOVE_CHRISTMAS_TREE_DECORATION',
    tableName: 'christmas_tree_strands',
    recordId: removed.id,
    metadata: { decoration: removed.kind },
  });
}

export async function saveChristmasStrand(
  adminClient: ChristmasTreeAdminClient,
  userId: string,
  decoration: 'garland' | 'lights',
  geometry: ChristmasStrandGeometry,
  canManage: boolean,
  strandId?: string
) {
  if (!canManage) {
    throw new ChristmasTreeRequestError('Only admins can manage Christmas Tree decorations', 403);
  }
  const event = await getActiveChristmasEvent(adminClient);
  if (!event) throw new Error('No active Christmas Tree event is configured');

  const coordinates = {
    start_x: geometry.startX,
    start_y: geometry.startY,
    end_x: geometry.endX,
    end_y: geometry.endY,
  };
  const saved = strandId
    ? await adminClient
        .from('christmas_tree_strands')
        .update(coordinates)
        .eq('id', strandId)
        .eq('event_id', event.id)
        .eq('kind', decoration)
        .select('id')
        .maybeSingle()
    : await adminClient
        .from('christmas_tree_strands')
        .insert({ event_id: event.id, kind: decoration, created_by: userId, ...coordinates })
        .select('id')
        .single();
  if (saved.error) throw new Error('Failed to save Christmas Tree strand');
  if (!saved.data) throw new ChristmasTreeRequestError('Christmas Tree strand not found', 404);

  const { error: eventError } = await adminClient
    .from('christmas_tree_events')
    .update({ [`${decoration}_manually_enabled`]: true })
    .eq('id', event.id);
  if (eventError) throw new Error('Failed to enable Christmas Tree decoration');

  logActivity(adminClient, {
    userId,
    action: 'SAVE_CHRISTMAS_TREE_STRAND',
    tableName: 'christmas_tree_strands',
    recordId: saved.data.id,
    metadata: { decoration, operation: strandId ? 'move' : 'create' },
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
