import { logActivity } from '@/lib/audit';
import { resolveStagedFormData } from '@/lib/storage/upload-staging.server';
import { UHP_ATTACHMENTS_BUCKET } from '@/lib/uhp';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readUhpScreenshot, requireUhpModule } from '../../../_lib';

export const runtime = 'nodejs';

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id: clientId } = await params;
  if (!z.string().uuid().safeParse(clientId).success) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await resolveStagedFormData(await request.formData());
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  }
  const screenshot = readUhpScreenshot(formData);
  if (!screenshot.ok) return NextResponse.json({ error: screenshot.error }, { status: 400 });
  const activityIdRaw = formData.get('activityId');
  const activityId =
    typeof activityIdRaw === 'string' && activityIdRaw.trim() ? activityIdRaw.trim() : null;
  if (activityId && !z.string().uuid().safeParse(activityId).success) {
    return NextResponse.json({ error: 'Invalid activity' }, { status: 400 });
  }

  const { admin } = auth.context;
  const { data: client } = await admin
    .from('uhp_clients')
    .select('id')
    .eq('id', clientId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  if (activityId) {
    const { data: activity } = await admin
      .from('uhp_client_activities')
      .select('id')
      .eq('id', activityId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!activity) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }

  const { file } = screenshot;
  const storagePath = `${clientId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
  const storage = admin.storage.from(UHP_ATTACHMENTS_BUCKET);
  const { error: uploadError } = await storage.upload(storagePath, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    console.error('Failed to upload UHP attachment:', uploadError.message);
    return NextResponse.json({ error: 'Failed to upload screenshot' }, { status: 500 });
  }

  const { data, error } = await admin
    .from('uhp_client_attachments')
    .insert({
      client_id: clientId,
      activity_id: activityId,
      storage_path: storagePath,
      file_name: file.name.slice(0, 255) || 'screenshot',
      mime_type: file.type,
      file_size: file.size,
      created_by: auth.context.userId,
    })
    .select('id, activity_id, file_name, mime_type, created_at')
    .single();
  if (error || !data) {
    await storage.remove([storagePath]).catch(() => undefined);
    return NextResponse.json({ error: 'Failed to save screenshot' }, { status: 500 });
  }

  const { data: signed } = await storage.createSignedUrl(storagePath, 60 * 60);
  void logActivity(admin, {
    userId: auth.context.userId,
    action: 'create_uhp_client_attachment',
    tableName: 'uhp_client_attachments',
    recordId: data.id,
    metadata: { clientId, activityId },
  });
  return NextResponse.json({ data: { ...data, url: signed?.signedUrl ?? null } }, { status: 201 });
}
