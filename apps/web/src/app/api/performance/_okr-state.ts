import type { createSupabaseAdminClient } from '@/lib/supabase/server';

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export interface OkrStateRow {
  id: string;
  status: string | null;
  progress: number | null;
}

export interface OkrStateTargetRow {
  okr_id: string;
  metric_type: 'number' | 'boolean' | 'currency' | 'tasks' | 'scale';
  current_value: number | null;
  target_value: number;
  weight: number | null;
  self_rating?: number | null;
}

const OKR_STATE_TARGET_SELECT =
  'okr_id, metric_type, current_value, target_value, weight, self_rating';
const OKR_STATE_TARGET_SELECT_LEGACY = 'okr_id, metric_type, current_value, target_value, weight';

function isMissingColumnError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  const details = 'details' in error && typeof error.details === 'string' ? error.details : '';
  const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : '';

  return [message, details, hint].some((value) => value.includes(columnName));
}

async function fetchTargets(
  supabaseAdmin: SupabaseAdminClient,
  okrIds: Array<string>,
  selectClause: string
): Promise<Array<OkrStateTargetRow>> {
  const { data, error } = await supabaseAdmin
    .from('okr_targets')
    .select(selectClause)
    .in('okr_id', okrIds)
    .is('deleted_at', null);

  if (error) {
    throw error;
  }

  return (data || []) as unknown as Array<OkrStateTargetRow>;
}

export function calculateTargetProgress(target: OkrStateTargetRow): number {
  const current = Number(target.current_value ?? 0);
  const targetValue = Number(target.target_value ?? 0);

  switch (target.metric_type) {
    case 'boolean':
      return current >= 1 ? 100 : 0;
    case 'scale':
      if (target.self_rating) {
        return Math.round((target.self_rating / 4) * 100);
      }

      return targetValue > 0 ? Math.min(Math.round((current / targetValue) * 100), 100) : 0;
    case 'number':
    case 'currency':
    case 'tasks':
      return targetValue > 0 ? Math.min(Math.round((current / targetValue) * 100), 100) : 0;
    default:
      return 0;
  }
}

export function calculateOkrProgress(targets: Array<OkrStateTargetRow>): number {
  if (targets.length === 0) {
    return 0;
  }

  const totalWeight = targets.reduce((sum, target) => sum + Number(target.weight ?? 0), 0);
  if (totalWeight <= 0) {
    return Math.round(
      targets.reduce((sum, target) => sum + calculateTargetProgress(target), 0) / targets.length
    );
  }

  const weightedTotal = targets.reduce(
    (sum, target) => sum + calculateTargetProgress(target) * Number(target.weight ?? 0),
    0
  );

  return Math.round(weightedTotal / totalWeight);
}

export function normalizeOkrStatus(status: string | null | undefined, progress: number): string {
  if (progress >= 100) {
    return 'completed';
  }

  if (status === 'completed') {
    return 'in_progress';
  }

  return status || 'in_progress';
}

export function applyComputedOkrState<T extends OkrStateRow>(
  okr: T,
  targets: Array<OkrStateTargetRow>
): T & { progress: number; status: string } {
  const progress = calculateOkrProgress(targets);

  return {
    ...okr,
    progress,
    status: normalizeOkrStatus(okr.status, progress),
  };
}

export async function fetchOkrTargetsByOkrIds(
  supabaseAdmin: SupabaseAdminClient,
  okrIds: Array<string>
): Promise<Map<string, Array<OkrStateTargetRow>>> {
  if (okrIds.length === 0) {
    return new Map();
  }

  let targets: Array<OkrStateTargetRow>;
  try {
    targets = await fetchTargets(supabaseAdmin, okrIds, OKR_STATE_TARGET_SELECT);
  } catch (error) {
    if (!isMissingColumnError(error, 'self_rating')) {
      throw error;
    }

    targets = await fetchTargets(supabaseAdmin, okrIds, OKR_STATE_TARGET_SELECT_LEGACY);
  }

  const targetsByOkrId = new Map<string, Array<OkrStateTargetRow>>();
  for (const target of targets) {
    const existing = targetsByOkrId.get(target.okr_id) || [];
    existing.push(target);
    targetsByOkrId.set(target.okr_id, existing);
  }

  return targetsByOkrId;
}

export async function syncOkrComputedState(
  supabaseAdmin: SupabaseAdminClient,
  okrId: string,
  fallbackStatus?: string | null
): Promise<{ progress: number; status: string } | null> {
  const { data: okr, error: okrError } = await supabaseAdmin
    .from('okrs')
    .select('id, status, progress')
    .eq('id', okrId)
    .maybeSingle();

  if (okrError) {
    throw okrError;
  }

  if (!okr) {
    return null;
  }

  const targetsByOkrId = await fetchOkrTargetsByOkrIds(supabaseAdmin, [okrId]);
  const progress = calculateOkrProgress(targetsByOkrId.get(okrId) || []);
  const status = normalizeOkrStatus(fallbackStatus ?? okr.status, progress);

  if (okr.progress === progress && okr.status === status) {
    return { progress, status };
  }

  const { error: updateError } = await supabaseAdmin
    .from('okrs')
    .update({ progress, status })
    .eq('id', okrId);

  if (updateError) {
    throw updateError;
  }

  return { progress, status };
}
