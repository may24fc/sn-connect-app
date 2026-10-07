import { logActivity } from '@/lib/audit';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedSupabase, isAnnouncementAdmin } from '../../../_lib';

interface RouteContext {
  params: Promise<{ id: string; attachmentId: string }>;
}

const paramsSchema = z.object({ id: z.string().uuid(), attachmentId: z.string().uuid() });

/**
 * Permanently removes an attachment. Allowed at any announcement status on purpose: an
 * admin must be able to pull a wrong or sensitive file from a published announcement.
 */
export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const parsed = paramsSchema.safeParse(await context.params);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }
    const { id: announcementId, attachmentId } = parsed.data;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAnnouncementAdmin(role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: attachment, error: loadError } = await supabase
      .from('announcement_attachments')
      .select('id, announcement_id, file_path, mime_type')
      .eq('id', attachmentId)
      .eq('announcement_id', announcementId)
      .maybeSingle();

    if (loadError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Remove the row first: if that fails, the attachment stays intact. A failed file
    // removal afterwards only leaves an unreferenced object behind.
    const { error: deleteError } = await supabase
      .from('announcement_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
    }

    const { error: removeError } = await supabase.storage
      .from('announcement-attachments')
      .remove([attachment.file_path]);
    if (removeError) {
      console.error('Failed to remove announcement attachment file:', removeError.message);
    }

    const { count } = await supabase
      .from('announcement_attachments')
      .select('*', { count: 'exact', head: true })
      .eq('announcement_id', announcementId);

    if ((count || 0) === 0) {
      await supabase
        .from('announcements')
        .update({ has_attachments: false })
        .eq('id', announcementId)
        .is('deleted_at', null);
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'delete_announcement_attachment',
      tableName: 'announcement_attachments',
      recordId: attachmentId,
      metadata: { announcementId, mimeType: attachment.mime_type },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      'Unexpected error in DELETE /api/announcements/[id]/attachments/[attachmentId]:',
      error
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
