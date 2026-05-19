/**
 * POST /api/projects/claim
 *   Body: { backlogId: string }
 *
 *   Race-safe: performs a conditional UPDATE WHERE status='claimable' and
 *   returns 409 Conflict if another user beat the caller to it. On success,
 *   auto-creates a formal `projects` row with the claimer as lead and links
 *   it back to the backlog row.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getProjectAuthedContext } from '../_lib';
import { createNotification } from '@/lib/notifications/create-notification';

export const runtime = 'nodejs';

const ClaimSchema = z.object({
  backlogId: z.string().uuid(),
});

const PROJECT_TARGET_DAYS = 30;

export async function POST(request: Request) {
  const ctx = await getProjectAuthedContext();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const userId = ctx.context.user.id;
  const admin = createSupabaseAdminClient();

  // 1. Load the row up front (for project name/description fields).
  const { data: backlog, error: loadErr } = await admin
    .from('project_backlog')
    .select('id, title, objective, status, claimed_by')
    .eq('id', parsed.data.backlogId)
    .maybeSingle();

  if (loadErr || !backlog) {
    return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });
  }
  if ((backlog as { status: string }).status !== 'claimable') {
    return NextResponse.json({ error: 'Already claimed' }, { status: 409 });
  }

  // 2. Auto-create a formal projects row.
  const today = new Date();
  const target = new Date(today);
  target.setUTCDate(target.getUTCDate() + PROJECT_TARGET_DAYS);

  const { data: project, error: projectErr } = await admin
    .from('projects')
    .insert({
      name: (backlog as { title: string }).title,
      description: (backlog as { objective: string }).objective,
      lead_user_id: userId,
      start_date: today.toISOString().slice(0, 10),
      target_end_date: target.toISOString().slice(0, 10),
      status: 'active',
      created_by: userId,
    })
    .select('id')
    .single();

  if (projectErr || !project) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }

  // 3. Race-safe claim of the backlog row.
  const { data: updated, error: updateErr } = await admin
    .from('project_backlog')
    .update({
      status: 'accepted',
      claimed_by: userId,
      claimed_at: new Date().toISOString(),
      project_id: (project as { id: string }).id,
    })
    .eq('id', parsed.data.backlogId)
    .eq('status', 'claimable')
    .select('id')
    .maybeSingle();

  if (updateErr) {
    // Try to undo the projects row to avoid orphans.
    await admin.from('projects').delete().eq('id', (project as { id: string }).id);
    return NextResponse.json({ error: 'Failed to claim project' }, { status: 500 });
  }

  if (!updated) {
    // Lost the race — another user claimed it concurrently.
    await admin.from('projects').delete().eq('id', (project as { id: string }).id);
    return NextResponse.json({ error: 'Already claimed' }, { status: 409 });
  }

  // 4. Fire-and-forget notification to the claimer (confirmation surface).
  await createNotification({
    userId,
    type: 'project_assigned',
    title: `You claimed "${(backlog as { title: string }).title}"`,
    message: (backlog as { objective: string }).objective,
    link: `/projects/${(project as { id: string }).id}`,
    metadata: { backlogId: parsed.data.backlogId, source: 'self-claim' },
    sendEmail: false,
    sendTelegram: false,
  });

  return NextResponse.json({
    backlogId: parsed.data.backlogId,
    projectId: (project as { id: string }).id,
  });
}
