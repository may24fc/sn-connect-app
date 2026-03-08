import { type NextRequest, NextResponse } from 'next/server';
import { getAdminClient, getAuthedSupabase, isAiAdmin } from '../../_lib';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md'];

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, error: authError } = await getAuthedSupabase();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAiAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const sourceType = formData.get('sourceType') as string | null;
    const tagsRaw = formData.get('tags') as string | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Validate file type by MIME and extension
    const extension = getFileExtension(file.name);
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          error: 'File type not allowed. Accepted types: PDF, DOC, DOCX, TXT, MD',
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const validSourceTypes = ['policy', 'handbook', 'faq', 'procedure', 'guideline', 'other'];
    const resolvedSourceType =
      sourceType && validSourceTypes.includes(sourceType) ? sourceType : 'other';

    const tags: string[] = tagsRaw
      ? tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const adminClient = getAdminClient();

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `knowledge-sources/${resolvedSourceType}/${timestamp}_${sanitizedFileName}`;

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('ai-knowledge')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading knowledge file to storage:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Create knowledge_sources record
    const { data: sourceData, error: sourceError } = await adminClient
      .from('knowledge_sources')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        source_type: resolvedSourceType,
        file_path: uploadData.path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        tags,
        is_active: true,
        processing_status: 'pending',
        created_by: user.id,
      })
      .select('*')
      .single();

    if (sourceError || !sourceData) {
      // Rollback: delete uploaded file
      await adminClient.storage.from('ai-knowledge').remove([filePath]);
      console.error('Error creating knowledge source record:', sourceError);
      return NextResponse.json(
        { error: 'Failed to create knowledge source record' },
        { status: 500 }
      );
    }

    // Trigger the Edge Function for embedding generation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

    if (supabaseUrl && serviceRoleKey) {
      fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceId: sourceData.id }),
      }).catch((triggerError) => {
        console.error('Failed to trigger embedding generation:', triggerError);
      });
    }

    // Log to audit_logs
    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'upload_knowledge_source',
      resource_type: 'knowledge_source',
      resource_id: sourceData.id,
      details: {
        title: title.trim(),
        source_type: resolvedSourceType,
        file_name: file.name,
        file_size: file.size,
      },
    });

    return NextResponse.json({ data: sourceData }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/ai/sources/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
