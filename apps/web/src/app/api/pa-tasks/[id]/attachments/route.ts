import { logActivity } from '@/lib/audit';
import { paTaskAttachmentCreateSchema } from '@/lib/schemas/pa-task.schema';
import { NextRequest, NextResponse } from 'next/server';
import { getPaTaskAuthedContext, getPaTaskWriteErrorMessage } from '../../_lib';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

async function ensureTaskExists(
  supabaseAdmin: { from: (table: string) => any },
  taskId: string
) {
  const { data, error } = await supabaseAdmin
    .from('pa_tasks')
    .select('id')
    .eq('id', taskId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('Failed to validate PA task id for attachment:', error);
    return { ok: false as const, status: 500, error: 'Failed to validate task' };
  }

  if (!data) {
    return { ok: false as const, status: 404, error: 'PA task not found' };
  }

  return { ok: true as const };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, canAccess } = auth.context;
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const taskCheck = await ensureTaskExists(supabaseAdmin, id);
    if (!taskCheck.ok) {
      return NextResponse.json({ error: taskCheck.error }, { status: taskCheck.status });
    }

    const { data, error } = await supabaseAdmin
      .from('pa_task_attachments')
      .select('*')
      .eq('pa_task_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch PA task attachments:', error);
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }

    const attachmentsWithUrls = await Promise.all(
      (data ?? []).map(async (attachment) => {
        if (attachment.attachment_type !== 'file' || !attachment.storage_path) {
          return attachment;
        }

        const { data: signedData, error: signedError } = await supabaseAdmin.storage
          .from('pa-task-attachments')
          .createSignedUrl(attachment.storage_path, 60 * 10);

        return {
          ...attachment,
          signed_url: signedError ? null : signedData?.signedUrl ?? null,
        };
      })
    );

    return NextResponse.json({ data: attachmentsWithUrls });
  } catch (error) {
    console.error('Unexpected error in GET /api/pa-tasks/[id]/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, canAccess } = auth.context;
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const taskCheck = await ensureTaskExists(supabaseAdmin, id);
    if (!taskCheck.ok) {
      return NextResponse.json({ error: taskCheck.error }, { status: taskCheck.status });
    }

    const contentType = request.headers.get('content-type') ?? '';
    const insertQuery = supabaseAdmin.from('pa_task_attachments');
    let data: any = null;
    let error: any = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const title = String(formData.get('title') ?? '').trim();
      const file = formData.get('file');

      if (!title) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'A file is required' }, { status: 400 });
      }

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: 'File exceeds 10MB size limit' }, { status: 400 });
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('pa-task-attachments')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Failed to upload PA task attachment file:', uploadError);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
      }

      const insertResult = await insertQuery
        .insert({
          pa_task_id: id,
          attachment_type: 'file',
          title,
          storage_path: storagePath,
          file_size_bytes: file.size,
          mime_type: file.type,
          created_by: user.id,
        })
        .select('*')
        .single();

      data = insertResult.data;
      error = insertResult.error;
      if (error || !data) {
        await supabaseAdmin.storage.from('pa-task-attachments').remove([storagePath]);
      }
    } else {
      const parsed = paTaskAttachmentCreateSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const insertResult =
        parsed.data.attachmentType === 'link'
          ? await insertQuery
              .insert({
                pa_task_id: id,
                attachment_type: 'link',
                title: parsed.data.title,
                url: parsed.data.url,
                created_by: user.id,
              })
              .select('*')
              .single()
          : await insertQuery
              .insert({
                pa_task_id: id,
                attachment_type: 'file',
                title: parsed.data.title,
                storage_path: parsed.data.storagePath,
                file_size_bytes: parsed.data.fileSizeBytes ?? null,
                mime_type: parsed.data.mimeType ?? null,
                created_by: user.id,
              })
              .select('*')
              .single();

      data = insertResult.data;
      error = insertResult.error;
    }

    if (error || !data) {
      console.error('Failed to create PA task attachment:', error);
      return NextResponse.json({ error: getPaTaskWriteErrorMessage(error) }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'create_pa_task_attachment',
      tableName: 'pa_task_attachments',
      recordId: data.id,
      metadata: { paTaskId: id, attachmentType: data.attachment_type },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/pa-tasks/[id]/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
