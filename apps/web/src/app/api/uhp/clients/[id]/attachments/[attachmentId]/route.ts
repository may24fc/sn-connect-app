import { logActivity } from '@/lib/audit';
import { UHP_ATTACHMENTS_BUCKET } from '@/lib/uhp';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUhpModule } from '../../../../_lib';

export const runtime = 'nodejs';

const paramsSchema = z.object({ id: z.string().uuid(), attachmentId: z.string().uuid() });

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
  const { id: clientId, attachmentId } = parsed.data;

  const { admin } = auth.context;
  // Soft-delete first so the screenshot disappears immediately and cannot be signed again;
  // the stored file is removed afterwards.
  const { data, error } = await admin
    .from('uhp_client_attachments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', attachmentId)
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .select('id, activity_id, storage_path')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Failed to delete screenshot' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });

  const { error: removeError } = await admin.storage
    .from(UHP_ATTACHMENTS_BUCKET)
    .remove([data.storage_path]);
  if (removeError) {
    // The row is already hidden; an orphaned file is inaccessible without a signed URL.
    console.error('Failed to remove UHP attachment file:', removeError.message);
  }

  void logActivity(admin, {
    userId: auth.context.userId,
    action: 'delete_uhp_client_attachment',
    tableName: 'uhp_client_attachments',
    recordId: attachmentId,
    metadata: { clientId, activityId: data.activity_id },
  });
  return NextResponse.json({ data: { id: attachmentId } });
}
