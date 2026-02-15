import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isAnnouncementAdmin } from '../../../_lib';

interface RouteContext {
  params: Promise<{ id: string; attachmentId: string }>;
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { attachmentId } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAnnouncementAdmin(role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: attachment, error: loadError } = await supabase
      .from('announcement_attachments')
      .select('id, announcement_id, file_path')
      .eq('id', attachmentId)
      .single();

    if (loadError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    await supabase.storage.from('announcement-attachments').remove([attachment.file_path]);

    const { error: deleteError } = await supabase
      .from('announcement_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
    }

    const { count } = await supabase
      .from('announcement_attachments')
      .select('*', { count: 'exact', head: true })
      .eq('announcement_id', attachment.announcement_id);

    if ((count || 0) === 0) {
      await supabase
        .from('announcements')
        .update({ has_attachments: false })
        .eq('id', attachment.announcement_id)
        .is('deleted_at', null);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      'Unexpected error in DELETE /api/announcements/[id]/attachments/[attachmentId]:',
      error
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
