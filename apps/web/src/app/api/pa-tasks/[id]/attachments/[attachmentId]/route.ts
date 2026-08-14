import { logActivity } from '@/lib/audit';
import { NextRequest, NextResponse } from 'next/server';
import { getPaTaskAuthedContext, getPaTaskWriteErrorMessage } from '../../../_lib';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, canAccess, role, canManage } = auth.context;
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, attachmentId } = await params;
    const { data: attachment, error: attachmentError } = await supabaseAdmin
      .from('pa_task_attachments')
      .select('id, pa_task_id, created_by, attachment_type, storage_path')
      .eq('id', attachmentId)
      .eq('pa_task_id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (attachmentError) {
      console.error('Failed to load PA task attachment for delete:', attachmentError);
      return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
    }

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const isAdmin = role === 'admin' || role === 'super_admin';
    if (!isAdmin && !canManage && attachment.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the uploader, a manager, or an admin can delete this attachment' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const { error: deleteError } = await supabaseAdmin
      .from('pa_task_attachments')
      .update({ deleted_at: now })
      .eq('id', attachmentId)
      .is('deleted_at', null);

    if (deleteError) {
      console.error('Failed to soft-delete PA task attachment:', deleteError);
      return NextResponse.json({ error: getPaTaskWriteErrorMessage(deleteError) }, { status: 500 });
    }

    if (attachment.attachment_type === 'file' && attachment.storage_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('pa-task-attachments')
        .remove([attachment.storage_path]);
      if (storageError) {
        console.error('Failed to delete PA task attachment file from storage:', storageError);
      }
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'delete_pa_task_attachment',
      tableName: 'pa_task_attachments',
      recordId: attachmentId,
      metadata: { paTaskId: id },
    });

    return NextResponse.json({ data: { id: attachmentId } });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/pa-tasks/[id]/attachments/[attachmentId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
