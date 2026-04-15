import { createSupabaseAdminClient } from '@/lib/supabase/server';

export type AtsEvaluationStatus =
  | 'idle'
  | 'queued'
  | 'parsing'
  | 'evaluating'
  | 'completed'
  | 'failed';

export async function updateApplicationEvaluationStatus(
  applicationId: string,
  status: AtsEvaluationStatus,
): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from('job_applications')
    .update({
      ai_evaluation_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to update ATS evaluation status: ${error.message}`);
  }
}

export async function getApplicationEvaluationStatus(
  applicationId: string,
): Promise<AtsEvaluationStatus | null> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('job_applications')
    .select('ai_evaluation_status')
    .eq('id', applicationId)
    .is('deleted_at', null)
    .single();

  if (error) {
    throw new Error(`Failed to fetch ATS evaluation status: ${error.message}`);
  }

  return (data?.ai_evaluation_status as AtsEvaluationStatus | null) ?? null;
}

export async function claimApplicationEvaluationStatus(
  applicationId: string,
  nextStatus: Extract<AtsEvaluationStatus, 'parsing' | 'evaluating'>,
  allowedCurrentStatuses: AtsEvaluationStatus[],
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('job_applications')
    .update({
      ai_evaluation_status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .is('deleted_at', null)
    .in('ai_evaluation_status', allowedCurrentStatuses)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to claim ATS evaluation status: ${error.message}`);
  }

  return Boolean(data);
}

export async function resetApplicationEvaluationState(
  applicationId: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from('job_applications')
    .update({
      ai_evaluation_status: 'queued',
      ai_match_score: null,
      ai_top_strengths: null,
      ai_missing_requirements: null,
      ai_executive_summary: null,
      ai_evaluated_at: null,
      ai_evaluation_model: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to reset ATS evaluation state: ${error.message}`);
  }
}