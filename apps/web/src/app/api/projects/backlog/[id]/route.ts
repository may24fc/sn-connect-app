import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { z } from 'zod';
import { getProjectAuthedContext } from '../../_lib';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const backlogPrioritySchema = z.enum(['Low', 'Medium', 'High', 'Urgent']);
const backlogStatusSchema = z.enum(['claimable', 'archived']);

const projectBacklogUpdateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200).optional(),
  problemStatement: z.string().trim().min(1, 'Problem statement is required').max(4000).optional(),
  objective: z.string().trim().min(1, 'Objective is required').max(4000).optional(),
  technicalScope: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  targetDepartments: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  priority: backlogPrioritySchema.optional(),
  status: backlogStatusSchema.optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = projectBacklogUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.problemStatement !== undefined) {
    update.problem_statement = parsed.data.problemStatement;
  }
  if (parsed.data.objective !== undefined) update.objective = parsed.data.objective;
  if (parsed.data.technicalScope !== undefined) update.technical_scope = parsed.data.technicalScope;
  if (parsed.data.targetDepartments !== undefined) {
    update.target_departments = parsed.data.targetDepartments;
  }
  if (parsed.data.priority !== undefined) update.priority = parsed.data.priority;
  if (parsed.data.status !== undefined) update.status = parsed.data.status;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('project_backlog')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });

  const hasContentChanges = Object.keys(update).some((key) => key !== 'status');

  if (existing.status === 'accepted') {
    return NextResponse.json(
      { error: 'Claimed pool items can no longer be changed' },
      { status: 409 }
    );
  }

  if (hasContentChanges && existing.status !== 'claimable') {
    return NextResponse.json({ error: 'Only claimable pool items can be edited' }, { status: 409 });
  }

  if (parsed.data.status === 'claimable' && existing.status !== 'archived') {
    return NextResponse.json(
      { error: 'Only archived pool items can be restored to claimable' },
      { status: 409 }
    );
  }

  if (parsed.data.status === 'archived' && existing.status !== 'claimable') {
    return NextResponse.json(
      { error: 'Only claimable pool items can be archived' },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('project_backlog')
    .update(update)
    .eq('id', id)
    .select(
      'id, title, problem_statement, objective, technical_scope, target_departments, priority, status, created_at'
    )
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json({ error: 'Backlog item state changed before the update completed' }, { status: 409 });
  }

  logActivity(supabase, {
    userId: user.id,
    action: 'project_backlog_updated',
    tableName: 'project_backlog',
    recordId: id,
    metadata: { fields: Object.keys(update) },
  });

  return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('project_backlog')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Backlog item not found' }, { status: 404 });
  if (existing.status !== 'claimable') {
    return NextResponse.json({ error: 'Only claimable pool items can be removed' }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from('project_backlog')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('status', 'claimable');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'project_backlog_archived',
    tableName: 'project_backlog',
    recordId: id,
  });

  return NextResponse.json({ ok: true });
}