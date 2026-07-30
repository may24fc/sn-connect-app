import {
  type BingoScoreSummary,
  type BingoTileState,
  EMPTY_BINGO_TILE_STATE,
  buildBingoScoreSummary,
  computeBingoScore,
  normalizeBingoTileState,
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
  hasPartner: boolean;
  isSelectable: boolean;
}

export interface BingoBoardSummary {
  id: string;
  customHabitText: string | null;
  tileState: BingoTileState;
}

export interface BingoWeekSummary {
  index: number;
  totalWeeks: number;
  startDate: string;
  endDate: string;
}

export interface BingoWeeklyRecordingSummary {
  id: string;
  weekIndex: number;
  weekStartDate: string;
  weekEndDate: string;
  recordingUrl: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface BingoAdminWeeklyRecordingSummary extends BingoWeeklyRecordingSummary {
  partnershipId: string;
  partnerAUserId: string;
  partnerAName: string;
  partnerBUserId: string;
  partnerBName: string;
}

export interface WellnessBingoSnapshot {
  cycle: BingoCycleSummary;
  activeWeek: BingoWeekSummary;
  board: BingoBoardSummary;
  weeklyScore: BingoScoreSummary;
  partner: BingoPartnerOption | null;
  currentWeekRecording: BingoWeeklyRecordingSummary | null;
  currentPartnershipId: string | null;
  personalScore: BingoScoreSummary;
  partnerScore: BingoScoreSummary | null;
  combinedScore: number;
  adminWeeklyRecordings: Array<BingoAdminWeeklyRecordingSummary>;
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

interface WeeklyRecordingRow {
  id: string;
  cycle_id: string;
  partnership_id: string;
  week_index: number;
  week_start_date: string;
  week_end_date: string;
  recording_url: string;
  updated_at: string;
  updated_by: string | null;
}

interface BingoBoardRow {
  id: string;
  custom_habit_text: string | null;
  tile_state: unknown;
  current_week_index: number;
  cumulative_completed_squares: number;
  cumulative_horizontal_bingos: number;
  cumulative_vertical_bingos: number;
}

function toBingoBoardRow(value: unknown): BingoBoardRow | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as Record<string, unknown>;
  const customHabitText = row.custom_habit_text;

  if (
    typeof row.id !== 'string' ||
    typeof row.current_week_index !== 'number' ||
    typeof row.cumulative_completed_squares !== 'number' ||
    typeof row.cumulative_horizontal_bingos !== 'number' ||
    typeof row.cumulative_vertical_bingos !== 'number' ||
    (customHabitText !== null && typeof customHabitText !== 'string')
  ) {
    return null;
  }

  return {
    id: row.id,
    custom_habit_text: customHabitText,
    tile_state: row.tile_state,
    current_week_index: row.current_week_index,
    cumulative_completed_squares: row.cumulative_completed_squares,
    cumulative_horizontal_bingos: row.cumulative_horizontal_bingos,
    cumulative_vertical_bingos: row.cumulative_vertical_bingos,
  };
}

const BINGO_BOARD_SELECT = [
  'id',
  'custom_habit_text',
  'tile_state',
  'current_week_index',
  'cumulative_completed_squares',
  'cumulative_horizontal_bingos',
  'cumulative_vertical_bingos',
].join(', ');

const ANCHORED_CYCLE_START_DATE = '2026-07-27';
const CYCLE_LENGTH_DAYS = 30;

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

export async function resolveActiveCycle(
  adminClient: ReturnType<typeof createSupabaseAdminClient>
) {
  const today = parseDateOnly(new Date().toISOString().slice(0, 10));
  const { startDate, endDate } = getAnchoredCycleWindow(today);

  const { error: deactivateError } = await adminClient
    .from('wellness_bingo_cycles')
    .update({ is_active: false })
    .eq('is_active', true)
    .is('deleted_at', null)
    .or(`start_date.neq.${startDate},end_date.neq.${endDate}`);

  if (deactivateError) {
    throw new Error('Failed to refresh wellness bingo cycle activity state');
  }

  const { data, error } = await adminClient
    .from('wellness_bingo_cycles')
    .upsert(
      {
        title: '30-Day Team Wellness Bingo',
        description:
          'Win by building consistent habits, not just ticking boxes. A perfect week = a bingo.',
        start_date: startDate,
        end_date: endDate,
        is_active: true,
        deleted_at: null,
      },
      { onConflict: 'start_date,end_date' }
    )
    .select('id, title, description, start_date, end_date')
    .single();

  if (error || !data) {
    throw new Error('Failed to fetch the active wellness bingo cycle');
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
  cycle: BingoCycleSummary,
  userId: string,
  createdBy: string
) {
  const activeWeek = getActiveWeekSummary(cycle);
  const { data: existing, error: fetchError } = await adminClient
    .from('wellness_bingo_boards')
    .select(BINGO_BOARD_SELECT)
    .eq('cycle_id', cycle.id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    throw new Error('Failed to fetch wellness bingo board');
  }

  if (existing) {
    const existingBoard = toBingoBoardRow(existing);
    if (!existingBoard) {
      throw new Error('Invalid wellness bingo board data');
    }
    return rollBoardIntoActiveWeek(adminClient, existingBoard, activeWeek);
  }

  const { data: inserted, error: insertError } = await adminClient
    .from('wellness_bingo_boards')
    .insert({
      cycle_id: cycle.id,
      user_id: userId,
      current_week_index: activeWeek.index,
      tile_state: EMPTY_BINGO_TILE_STATE,
      created_by: createdBy,
    })
    .select(BINGO_BOARD_SELECT)
    .single();

  if (insertError || !inserted) {
    throw new Error('Failed to initialize wellness bingo board');
  }

  const insertedBoard = toBingoBoardRow(inserted);
  if (!insertedBoard) {
    throw new Error('Invalid wellness bingo board data');
  }

  return insertedBoard;
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
  for (const partnership of partnerships ?? []) {
    const row = partnership as PartnershipRow;
    partneredUserIds.add(row.user_a_id);
    partneredUserIds.add(row.user_b_id);
  }

  const candidateRows = (users ?? []) as Array<UserRoleRow>;

  return getPartnerProfiles(adminClient, candidateRows, partneredUserIds, currentPartnerId);
}

export async function buildWellnessBingoSnapshot(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  requesterRole?: string | null
) {
  const cycle = await resolveActiveCycle(adminClient);

  if (!cycle) {
    throw new Error('No active wellness bingo cycle is configured');
  }

  const activeWeek = getActiveWeekSummary(cycle);
  const boardRow = await ensureBoard(adminClient, cycle, userId, userId);
  const tileState = normalizeBingoTileState(boardRow.tile_state);
  const weeklyScore = computeBingoScore(tileState);
  const personalScore = buildCycleToDateScore(boardRow, weeklyScore);

  const partnership = await findUserPartnership(adminClient, cycle.id, userId);
  const currentWeekRecording = partnership
    ? await findCurrentWeekRecording(adminClient, partnership.id, activeWeek)
    : null;
  const partnerUserId = partnership
    ? partnership.user_a_id === userId
      ? partnership.user_b_id
      : partnership.user_a_id
    : null;

  let partner: BingoPartnerOption | null = null;
  let partnerScore: BingoScoreSummary | null = null;

  if (partnerUserId) {
    const partnerBoard = await ensureBoard(adminClient, cycle, partnerUserId, userId);
    const partnerWeeklyScore = computeBingoScore(normalizeBingoTileState(partnerBoard.tile_state));
    partnerScore = buildCycleToDateScore(partnerBoard, partnerWeeklyScore);

    const profiles = await getPartnerProfiles(adminClient, [
      { id: partnerUserId, role: 'employee', status: null },
    ]);
    partner = profiles[0] ?? null;
  }

  const adminWeeklyRecordings = isAdminRole(requesterRole)
    ? await fetchAdminWeeklyRecordings(adminClient, cycle.id)
    : [];

  return {
    cycle,
    activeWeek,
    board: {
      id: boardRow.id,
      customHabitText: boardRow.custom_habit_text,
      tileState,
    },
    weeklyScore,
    partner,
    currentWeekRecording,
    currentPartnershipId: partnership?.id ?? null,
    personalScore,
    partnerScore,
    combinedScore: personalScore.totalPoints + (partnerScore?.totalPoints ?? 0),
    adminWeeklyRecordings,
  } satisfies WellnessBingoSnapshot;
}

export function normalizePartnershipUsers(userId: string, partnerUserId: string) {
  return [userId, partnerUserId].sort((left, right) => left.localeCompare(right)) as [
    string,
    string,
  ];
}

function buildCycleToDateScore(boardRow: BingoBoardRow, weeklyScore: BingoScoreSummary) {
  return buildBingoScoreSummary(
    boardRow.cumulative_completed_squares + weeklyScore.completedSquares,
    boardRow.cumulative_horizontal_bingos + weeklyScore.horizontalBingos,
    boardRow.cumulative_vertical_bingos + weeklyScore.verticalBingos
  );
}

export function getActiveWeekSummary(cycle: BingoCycleSummary): BingoWeekSummary {
  const cycleStart = parseDateOnly(cycle.startDate);
  const cycleEnd = parseDateOnly(cycle.endDate);
  const today = parseDateOnly(new Date().toISOString().slice(0, 10));
  const firstWeekStart = startOfWeekMonday(cycleStart);
  const lastWeekStart = startOfWeekMonday(cycleEnd);
  const todayWeekStart = startOfWeekMonday(today);
  const totalWeeks = diffInWeeks(firstWeekStart, lastWeekStart) + 1;
  const clampedWeekStart = clampDate(todayWeekStart, firstWeekStart, lastWeekStart);
  const index = diffInWeeks(firstWeekStart, clampedWeekStart) + 1;
  const weekStart = maxDate(cycleStart, clampedWeekStart);
  const weekEnd = minDate(cycleEnd, addDays(clampedWeekStart, 6));

  return {
    index,
    totalWeeks,
    startDate: formatDateOnly(weekStart),
    endDate: formatDateOnly(weekEnd),
  };
}

async function rollBoardIntoActiveWeek(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  boardRow: BingoBoardRow,
  activeWeek: BingoWeekSummary
) {
  if (boardRow.current_week_index >= activeWeek.index) {
    return boardRow;
  }

  const weeklyScore = computeBingoScore(normalizeBingoTileState(boardRow.tile_state));
  const { data: updatedBoard, error } = await adminClient
    .from('wellness_bingo_boards')
    .update({
      current_week_index: activeWeek.index,
      cumulative_completed_squares:
        boardRow.cumulative_completed_squares + weeklyScore.completedSquares,
      cumulative_horizontal_bingos:
        boardRow.cumulative_horizontal_bingos + weeklyScore.horizontalBingos,
      cumulative_vertical_bingos: boardRow.cumulative_vertical_bingos + weeklyScore.verticalBingos,
      tile_state: EMPTY_BINGO_TILE_STATE,
    })
    .eq('id', boardRow.id)
    .select(BINGO_BOARD_SELECT)
    .single();

  if (error || !updatedBoard) {
    throw new Error('Failed to refresh weekly wellness bingo board');
  }

  const normalizedBoard = toBingoBoardRow(updatedBoard);
  if (!normalizedBoard) {
    throw new Error('Invalid wellness bingo board data');
  }

  return normalizedBoard;
}

async function findCurrentWeekRecording(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  partnershipId: string,
  activeWeek: BingoWeekSummary
) {
  const { data, error } = await adminClient
    .from('wellness_bingo_weekly_recordings')
    .select(
      'id, cycle_id, partnership_id, week_index, week_start_date, week_end_date, recording_url, updated_at, updated_by'
    )
    .eq('partnership_id', partnershipId)
    .eq('week_index', activeWeek.index)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to fetch weekly partner recording');
  }

  if (!data) {
    return null;
  }

  return toWeeklyRecordingSummary(data as WeeklyRecordingRow);
}

async function fetchAdminWeeklyRecordings(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  cycleId: string
) {
  const { data: recordingsData, error: recordingsError } = await adminClient
    .from('wellness_bingo_weekly_recordings')
    .select(
      'id, cycle_id, partnership_id, week_index, week_start_date, week_end_date, recording_url, updated_at, updated_by'
    )
    .eq('cycle_id', cycleId)
    .is('deleted_at', null)
    .order('week_index', { ascending: false })
    .order('updated_at', { ascending: false });

  if (recordingsError) {
    throw new Error('Failed to fetch admin weekly recordings');
  }

  const recordings = (recordingsData ?? []) as Array<WeeklyRecordingRow>;
  if (recordings.length === 0) {
    return [] satisfies Array<BingoAdminWeeklyRecordingSummary>;
  }

  const partnershipIds = [...new Set(recordings.map((entry) => entry.partnership_id))];

  const { data: partnershipsData, error: partnershipsError } = await adminClient
    .from('wellness_bingo_partnerships')
    .select('id, user_a_id, user_b_id')
    .in('id', partnershipIds)
    .is('deleted_at', null);

  if (partnershipsError) {
    throw new Error('Failed to fetch partnerships for weekly recordings');
  }

  const partnerships = (partnershipsData ?? []) as Array<PartnershipRow>;
  const partnershipById = new Map(partnerships.map((entry) => [entry.id, entry]));

  const uniqueUserIds = [
    ...new Set(partnerships.flatMap((entry) => [entry.user_a_id, entry.user_b_id])),
  ];
  if (uniqueUserIds.length === 0) {
    return [] satisfies Array<BingoAdminWeeklyRecordingSummary>;
  }

  const { data: usersData, error: usersError } = await adminClient
    .from('users')
    .select('id, role, status')
    .in('id', uniqueUserIds)
    .is('deleted_at', null);

  if (usersError) {
    throw new Error('Failed to fetch user rows for weekly recordings');
  }

  const profileRows = (usersData ?? []) as Array<UserRoleRow>;
  const profiles = await getPartnerProfiles(adminClient, profileRows);
  const profileNameById = new Map(profiles.map((entry) => [entry.id, entry.name]));

  return recordings
    .map((recording) => {
      const partnership = partnershipById.get(recording.partnership_id);

      if (!partnership) {
        return null;
      }

      return {
        ...toWeeklyRecordingSummary(recording),
        partnershipId: partnership.id,
        partnerAUserId: partnership.user_a_id,
        partnerAName: profileNameById.get(partnership.user_a_id) ?? 'Unknown user',
        partnerBUserId: partnership.user_b_id,
        partnerBName: profileNameById.get(partnership.user_b_id) ?? 'Unknown user',
      } satisfies BingoAdminWeeklyRecordingSummary;
    })
    .filter((entry): entry is BingoAdminWeeklyRecordingSummary => entry !== null);
}

function toWeeklyRecordingSummary(recording: WeeklyRecordingRow): BingoWeeklyRecordingSummary {
  return {
    id: recording.id,
    weekIndex: recording.week_index,
    weekStartDate: recording.week_start_date,
    weekEndDate: recording.week_end_date,
    recordingUrl: recording.recording_url,
    updatedAt: recording.updated_at,
    updatedBy: recording.updated_by,
  };
}

function isAdminRole(role: string | null | undefined) {
  return role === 'admin' || role === 'super_admin';
}

function getAnchoredCycleWindow(today: Date) {
  const anchor = parseDateOnly(ANCHORED_CYCLE_START_DATE);
  const daysFromAnchor = diffInDays(anchor, today);
  const cycleOffset = Math.floor(daysFromAnchor / CYCLE_LENGTH_DAYS);
  const start = addDays(anchor, cycleOffset * CYCLE_LENGTH_DAYS);
  const end = addDays(start, CYCLE_LENGTH_DAYS - 1);

  return {
    startDate: formatDateOnly(start),
    endDate: formatDateOnly(end),
  };
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfWeekMonday(value: Date) {
  const day = value.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(value, offset);
}

function diffInDays(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

function diffInWeeks(start: Date, end: Date) {
  return Math.floor(diffInDays(start, end) / 7);
}

function maxDate(left: Date, right: Date) {
  return left.getTime() >= right.getTime() ? left : right;
}

function minDate(left: Date, right: Date) {
  return left.getTime() <= right.getTime() ? left : right;
}

function clampDate(value: Date, min: Date, max: Date) {
  return minDate(maxDate(value, min), max);
}

async function getPartnerProfiles(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  users: Array<UserRoleRow>,
  partneredUserIds?: ReadonlySet<string>,
  currentPartnerId?: string | null
) {
  if (users.length === 0) {
    return [] satisfies Array<BingoPartnerOption>;
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
  for (const entry of (employeeProfiles ?? []) as Array<EmployeeProfileRow>) {
    profileByUserId.set(entry.user_id, entry);
  }

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
        hasPartner: partneredUserIds?.has(entry.id) ?? false,
        isSelectable: !partneredUserIds?.has(entry.id) || entry.id === currentPartnerId,
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
