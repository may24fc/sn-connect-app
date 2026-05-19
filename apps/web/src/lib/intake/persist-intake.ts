/**
 * Shared logic for persisting an extracted project intake into the
 * `project_backlog` table (and optionally auto-creating a formal `projects`
 * row when the CEO assigned the work to a specific intern).
 *
 * Used by both the Inngest job (Telegram intake) and the internal
 * /api/projects/intake REST endpoint.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IntakeExtractionResult } from '@hr-portal/ai';

export interface PersistIntakeInput {
  extraction: IntakeExtractionResult;
  source: {
    chatId?: string | null;
    messageId?: string | null;
    rawTranscript: string;
  };
  /** Auth user ID to attribute the backlog `created_by` to. */
  createdByUserId?: string | null;
}

export interface PersistIntakeResult {
  backlogId: string;
  /** Resolved auth user ID when CEO named an assignee. */
  assignedUserId: string | null;
  /** Newly created formal project ID when assignment happened. */
  projectId: string | null;
  /** Backlog row status after persistence ('claimable' or 'accepted'). */
  status: 'claimable' | 'accepted';
}

const PROJECT_TARGET_DAYS = 30;

/**
 * Looks up a user by informal name hint via the `employees.nicknames` array.
 * Falls back to first/last name match (case-insensitive) if no nickname hit.
 */
export async function resolveAssigneeByName(
  admin: SupabaseClient,
  nameHint: string
): Promise<string | null> {
  const cleaned = nameHint.trim().toLowerCase();
  if (!cleaned) return null;

  // 1. nickname GIN match
  const { data: nickRows, error: nickErr } = await admin
    .from('employees')
    .select('user_id, nicknames')
    .contains('nicknames', [cleaned])
    .limit(2);

  if (nickErr) {
    console.error('[persistIntake] nickname lookup failed:', nickErr);
  } else if (nickRows && nickRows.length === 1) {
    return (nickRows[0] as { user_id: string }).user_id ?? null;
  }

  // 2. first_name ilike fallback
  const { data: nameRows, error: nameErr } = await admin
    .from('employees')
    .select('user_id, first_name')
    .ilike('first_name', cleaned)
    .limit(2);

  if (nameErr) {
    console.error('[persistIntake] first_name lookup failed:', nameErr);
    return null;
  }

  if (nameRows && nameRows.length === 1) {
    return (nameRows[0] as { user_id: string }).user_id ?? null;
  }

  return null;
}

export async function persistProjectIntake(
  admin: SupabaseClient,
  input: PersistIntakeInput
): Promise<PersistIntakeResult> {
  const { extraction, source, createdByUserId } = input;

  // 1. Resolve assignee, if any.
  const assignedUserId = extraction.assigned_name_hint
    ? await resolveAssigneeByName(admin, extraction.assigned_name_hint)
    : null;

  // 2. If we have an assignee, spawn a formal projects row first so we can
  //    link it from the backlog row in a single insert.
  let projectId: string | null = null;
  if (assignedUserId) {
    const today = new Date();
    const target = new Date(today);
    target.setUTCDate(target.getUTCDate() + PROJECT_TARGET_DAYS);

    const { data: project, error: projectErr } = await admin
      .from('projects')
      .insert({
        name: extraction.title,
        description: extraction.objective,
        lead_user_id: assignedUserId,
        start_date: today.toISOString().slice(0, 10),
        target_end_date: target.toISOString().slice(0, 10),
        status: 'active',
        created_by: createdByUserId ?? null,
      })
      .select('id')
      .single();

    if (projectErr) {
      console.error('[persistIntake] failed to auto-create project:', projectErr);
    } else {
      projectId = (project as { id: string }).id;
    }
  }

  const status: 'claimable' | 'accepted' = assignedUserId ? 'accepted' : 'claimable';

  const { data: backlog, error: backlogErr } = await admin
    .from('project_backlog')
    .insert({
      title: extraction.title,
      problem_statement: extraction.problem_statement,
      objective: extraction.objective,
      technical_scope: extraction.technical_scope,
      target_departments: extraction.target_departments,
      priority: extraction.priority,
      status,
      claimed_by: assignedUserId,
      claimed_at: assignedUserId ? new Date().toISOString() : null,
      project_id: projectId,
      source_chat_id: source.chatId ?? null,
      source_message_id: source.messageId ?? null,
      raw_transcript: source.rawTranscript,
      extraction_model: extraction.model,
      created_by: createdByUserId ?? null,
    })
    .select('id')
    .single();

  if (backlogErr || !backlog) {
    throw new Error(`Failed to insert project_backlog row: ${backlogErr?.message ?? 'unknown'}`);
  }

  return {
    backlogId: (backlog as { id: string }).id,
    assignedUserId,
    projectId,
    status,
  };
}
