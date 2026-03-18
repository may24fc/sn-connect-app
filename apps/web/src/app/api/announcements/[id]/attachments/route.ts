import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isAnnouncementAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_SIZE = 10 * 1024 * 1024;

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error: fetchError } = await supabase
      .from('announcement_attachments')
      .select('*')
      .eq('announcement_id', id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/announcements/[id]/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAnnouncementAdmin(role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A file is required' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10MB size limit' }, { status: 400 });
    }

    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${id}/${crypto.randomUUID()}-${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('announcement-attachments')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading attachment to storage:', uploadError);
      return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
    }

    const { data, error: insertError } = await supabase
      .from('announcement_attachments')
      .insert({
        announcement_id: id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      })
      .select('*')
      .single();

    if (insertError || !data) {
      await supabase.storage.from('announcement-attachments').remove([filePath]);
      return NextResponse.json({ error: 'Failed to save attachment metadata' }, { status: 500 });
    }

    await supabase
      .from('announcements')
      .update({ has_attachments: true })
      .eq('id', id)
      .is('deleted_at', null);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/announcements/[id]/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
