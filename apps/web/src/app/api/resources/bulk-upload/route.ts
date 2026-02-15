import { bulkUploadSchema } from '@/lib/schemas/resource.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin, normalizeExcerpt } from '../_lib';

const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as Array<File>;
    const metadataStr = formData.get('metadata') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    let metadata = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        return NextResponse.json({ error: 'Invalid metadata JSON' }, { status: 400 });
      }
    }

    const parsed = bulkUploadSchema.safeParse(metadata);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid metadata', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { category, resourceType, isPublic, targetRoles } = parsed.data;

    const results: Array<{
      fileName: string;
      success: boolean;
      error?: string;
      resourceId?: string;
    }> = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        results.push({
          fileName: file.name,
          success: false,
          error: `File type ${file.type} is not allowed`,
        });
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        results.push({
          fileName: file.name,
          success: false,
          error: 'File size exceeds 100MB limit',
        });
        continue;
      }

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${category}/${timestamp}_${sanitizedFileName}`;

      // Upload to Supabase Storage
      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('resources-library')
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        results.push({ fileName: file.name, success: false, error: 'Failed to upload file' });
        continue;
      }

      // Create resource record
      const title = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const { data: resource, error: createError } = await supabase
        .from('resources')
        .insert({
          title,
          description: null,
          excerpt: normalizeExcerpt(null, null),
          resource_type: resourceType,
          category,
          tags: [],
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          status: 'draft',
          is_public: isPublic,
          target_roles: targetRoles,
          author_id: user.id,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (createError || !resource) {
        console.error('Error creating resource:', createError);
        results.push({
          fileName: file.name,
          success: false,
          error: 'Failed to create resource record',
        });
        continue;
      }

      results.push({ fileName: file.name, success: true, resourceId: resource.id });
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      data: {
        results,
        summary: {
          total: files.length,
          success: successCount,
          failed: failureCount,
        },
      },
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/resources/bulk-upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
