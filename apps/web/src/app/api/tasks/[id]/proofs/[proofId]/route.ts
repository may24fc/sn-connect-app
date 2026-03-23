import { logActivity } from '@/lib/audit';
import { type NextRequest, NextResponse } from 'next/server';
import { getTaskAuthedContext } from '../../../_lib';

/**
 * DELETE /api/tasks/[id]/proofs/[proofId]
 * Soft delete a proof (only the submitter can delete)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; proofId: string }> }
) {
  try {
    const { id, proofId } = await params;
    const auth = await getTaskAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, user } = auth.context;

    // Verify the proof exists and belongs to the user
    const { data: proof, error: proofError } = await supabase
      .from('task_proofs')
      .select('id, submitted_by, task_id')
      .eq('id', proofId)
      .eq('task_id', id)
      .is('deleted_at', null)
      .single();

    if (proofError || !proof) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 });
    }

    if (proof.submitted_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the proof submitter can delete it' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('task_proofs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', proofId);

    if (error) {
      console.error('Error deleting task proof:', error);
      return NextResponse.json({ error: 'Failed to delete proof' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'delete_task_proof',
      tableName: 'task_proofs',
      recordId: proofId,
      metadata: { taskId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/tasks/[id]/proofs/[proofId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
