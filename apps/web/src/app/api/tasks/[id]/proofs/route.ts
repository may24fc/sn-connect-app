import { logActivity } from '@/lib/audit';
import {
  createNotification,
  getUserDisplayName,
} from '@/lib/notifications/create-notification';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTaskAuthedContext } from '../../_lib';

const proofCreateSchema = z.object({
  proofType: z.enum(['link', 'note']),
  content: z.string().min(1, 'Content is required').max(2000),
  label: z.string().max(200).optional().nullable(),
});

/**
 * GET /api/tasks/[id]/proofs
 * List proofs for a task
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getTaskAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase } = auth.context;

    // Verify task exists and user can access it
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const { data: proofs, error } = await supabase
      .from('task_proofs')
      .select('*')
      .eq('task_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching task proofs:', error);
      return NextResponse.json({ error: 'Failed to load proofs' }, { status: 500 });
    }

    // Resolve submitter names
    const submitterIds = [...new Set((proofs || []).map((p: { submitted_by: string }) => p.submitted_by))];
    let namesMap = new Map<string, string>();

    if (submitterIds.length > 0) {
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id, first_name, last_name')
        .in('user_id', submitterIds)
        .is('deleted_at', null);

      for (const emp of employees || []) {
        namesMap.set(emp.user_id, `${emp.first_name} ${emp.last_name}`);
      }
    }

    const enrichedProofs = (proofs || []).map((proof: { id: string; submitted_by: string; [key: string]: unknown }) => ({
      ...proof,
      submitted_by_name: namesMap.get(proof.submitted_by) || 'Unknown',
    }));

    return NextResponse.json({ data: enrichedProofs });
  } catch (error) {
    console.error('Unexpected error in GET /api/tasks/[id]/proofs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/tasks/[id]/proofs
 * Submit proof for a task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getTaskAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, user } = auth.context;

    const body = await request.json();
    const parsed = proofCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify user is the assignee of this task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, assigned_to, assigned_by')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.assigned_to !== user.id) {
      return NextResponse.json(
        { error: 'Only the task assignee can submit proof' },
        { status: 403 }
      );
    }

    const { data: proof, error } = await supabase
      .from('task_proofs')
      .insert({
        task_id: id,
        submitted_by: user.id,
        proof_type: parsed.data.proofType,
        content: parsed.data.content,
        label: parsed.data.label || null,
      })
      .select('*')
      .single();

    if (error || !proof) {
      console.error('Error creating task proof:', error);
      return NextResponse.json({ error: 'Failed to submit proof' }, { status: 500 });
    }

    // Notify the assigner (super-admin) about the proof submission
    if (task.assigned_by) {
      const submitterName = await getUserDisplayName(user.id);
      createNotification({
        userId: task.assigned_by,
        type: 'system',
        title: 'Task Proof Submitted',
        message: `${submitterName} submitted proof for "${task.title}"`,
        link: `/super-admin/tasks/${id}`,
        metadata: { taskId: id, proofId: proof.id },
      });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'submit_task_proof',
      tableName: 'task_proofs',
      recordId: proof.id,
      metadata: { taskId: id, proofType: parsed.data.proofType },
    });

    return NextResponse.json({ data: proof }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/tasks/[id]/proofs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
