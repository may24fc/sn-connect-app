import {
  computeBingoScore,
  normalizeBingoTileState,
  type BingoScoreSummary,
  type BingoTileState,
  EMPTY_BINGO_TILE_STATE,
} from '@/lib/bingo';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export interface BingoCycleSummary {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
}

export interface BingoPartnerOption {
  id: string;
  role: string;
  name: string;
  email: string | null;
}

export interface BingoBoardSummary {
  id: string;
  customHabitText: string | null;
  tileState: BingoTileState;
}

export interface WellnessBingoSnapshot {
  cycle: BingoCycleSummary;
  board: BingoBoardSummary;
  partner: BingoPartnerOption | null;
  personalScore: BingoScoreSummary;
  partnerScore: BingoScoreSummary | null;
  combinedScore: number;
}

interface UserRoleRow {
  id: string;
  role: string;
  status: string | null;
}

interface EmployeeProfileRow {
  user_id: string;
  first_name: string;
  last_name: string;
  company_email: string | null;
  personal_email: string | null;
}

interface PartnershipRow {
  id: string;
  cycle_id: string;
  user_a_id: string;
  user_b_id: string;
}

export async function getAuthedSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  let role: string | null = null;
  if (typeof user.app_metadata?.db_role === 'string') {
    role = user.app_metadata.db_role;
  }

  if (!role) {
    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (roleError) {
      return { supabase, user, role: null, error: 'Failed to resolve user role' as const };
    }

    role = roleData?.role ?? null;
  }

  return { supabase, user, role, error: null };
}

export function getBingoAdminClient() {
  return createSupabaseAdminClient();
}

export async function resolveActiveCycle(adminClient: ReturnType<typeof createSupabaseAdminClient>) {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await adminClient
    .from('wellness_bingo_cycles')
    .select('id, title, description, start_date, end_date')
    .eq('is_active', true)
    .is('deleted_at', null)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to fetch the active wellness bingo cycle');
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    startDate: data.start_date,
    endDate: data.end_date,
  } satisfies BingoCycleSummary;
}

export async function ensureBoard(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  cycleId: string,
  userId: string,
  createdBy: string
) {
  const { data: existing, error: fetchError } = await adminClient
    .from('wellness_bingo_boards')
    .select('id, custom_habit_text, tile_state')
    .eq('cycle_id', cycleId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    throw new Error('Failed to fetch wellness bingo board');
  }

  if (existing) {
    return existing;
  }

  const { data: inserted, error: insertError } = await adminClient
    .from('wellness_bingo_boards')
    .insert({
      cycle_id: cycleId,
      user_id: userId,
      tile_state: EMPTY_BINGO_TILE_STATE,
      created_by: createdBy,
    })
    .select('id, custom_habit_text, tile_state')
    .single();

  if (insertError || !inserted) {
    throw new Error('Failed to initialize wellness bingo board');
  }

  return inserted;
}

export async function findUserPartnership(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  cycleId: string,
  userId: string
) {
  const { data, error } = await adminClient
    .from('wellness_bingo_partnerships')
    .select('id, cycle_id, user_a_id, user_b_id')
    .eq('cycle_id', cycleId)
    .is('deleted_at', null)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to fetch wellness bingo partnership');
  }

  return (data ?? null) as PartnershipRow | null;
}

export async function fetchPartnerOptions(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  cycleId: string,
  currentUserId: string
) {
  const currentPartnership = await findUserPartnership(adminClient, cycleId, currentUserId);
  const currentPartnerId = currentPartnership
    ? currentPartnership.user_a_id === currentUserId
      ? currentPartnership.user_b_id
      : currentPartnership.user_a_id
    : null;

  const { data: users, error: usersError } = await adminClient
    .from('users')
    .select('id, role, status')
    .in('role', ['employee', 'associate', 'admin', 'super_admin'])
    .neq('id', currentUserId)
    .is('deleted_at', null)
    .neq('status', 'terminated');

  if (usersError) {
    throw new Error('Failed to fetch partner options');
  }

  const { data: partnerships, error: partnershipsError } = await adminClient
    .from('wellness_bingo_partnerships')
    .select('id, cycle_id, user_a_id, user_b_id')
    .eq('cycle_id', cycleId)
    .is('deleted_at', null);

  if (partnershipsError) {
    throw new Error('Failed to fetch partner availability');
  }

  const partneredUserIds = new Set<string>();
  (partnerships ?? []).forEach((partnership) => {
    const row = partnership as PartnershipRow;
    partneredUserIds.add(row.user_a_id);
    partneredUserIds.add(row.user_b_id);
  });

  const candidateRows = ((users ?? []) as UserRoleRow[]).filter((candidate) => {
    if (candidate.id === currentPartnerId) {
      return true;
    }

    return !partneredUserIds.has(candidate.id);
  });

  return getPartnerProfiles(adminClient, candidateRows);
}

export async function buildWellnessBingoSnapshot(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
) {
  const cycle = await resolveActiveCycle(adminClient);

  if (!cycle) {
    throw new Error('No active wellness bingo cycle is configured');
  }

  const boardRow = await ensureBoard(adminClient, cycle.id, userId, userId);
  const tileState = normalizeBingoTileState(boardRow.tile_state);
  const personalScore = computeBingoScore(tileState);

  const partnership = await findUserPartnership(adminClient, cycle.id, userId);
  const partnerUserId = partnership
    ? partnership.user_a_id === userId
      ? partnership.user_b_id
      : partnership.user_a_id
    : null;

  let partner: BingoPartnerOption | null = null;
  let partnerScore: BingoScoreSummary | null = null;

  if (partnerUserId) {
    const { data: partnerBoard, error: partnerBoardError } = await adminClient
      .from('wellness_bingo_boards')
      .select('tile_state')
      .eq('cycle_id', cycle.id)
      .eq('user_id', partnerUserId)
      .is('deleted_at', null)
      .maybeSingle();

    if (partnerBoardError) {
      throw new Error('Failed to fetch partner wellness bingo board');
    }

    if (partnerBoard) {
      partnerScore = computeBingoScore(normalizeBingoTileState(partnerBoard.tile_state));
    }

    const profiles = await getPartnerProfiles(adminClient, [
      { id: partnerUserId, role: 'employee', status: null },
    ]);
    partner = profiles[0] ?? null;
  }

  return {
    cycle,
    board: {
      id: boardRow.id,
      customHabitText: boardRow.custom_habit_text,
      tileState,
    },
    partner,
    personalScore,
    partnerScore,
    combinedScore: personalScore.totalPoints + (partnerScore?.totalPoints ?? 0),
  } satisfies WellnessBingoSnapshot;
}

export function normalizePartnershipUsers(userId: string, partnerUserId: string) {
  return [userId, partnerUserId].sort((left, right) => left.localeCompare(right)) as [string, string];
}

async function getPartnerProfiles(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  users: UserRoleRow[]
) {
  if (users.length === 0) {
    return [] satisfies BingoPartnerOption[];
  }

  const userIds = users.map((entry) => entry.id);
  const { data: employeeProfiles, error } = await adminClient
    .from('employees')
    .select('user_id, first_name, last_name, company_email, personal_email')
    .in('user_id', userIds)
    .is('deleted_at', null);

  if (error) {
    throw new Error('Failed to fetch partner profiles');
  }

  const profileByUserId = new Map<string, EmployeeProfileRow>();
  ((employeeProfiles ?? []) as EmployeeProfileRow[]).forEach((entry) => {
    profileByUserId.set(entry.user_id, entry);
  });

  return users
    .map((entry) => {
      const profile = profileByUserId.get(entry.id);

      return {
        id: entry.id,
        role: entry.role,
        name: profile
          ? `${profile.first_name} ${profile.last_name}`.trim()
          : formatRoleLabel(entry.role),
        email: profile?.company_email || profile?.personal_email || null,
      } satisfies BingoPartnerOption;
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function formatRoleLabel(role: string) {
  return role
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}