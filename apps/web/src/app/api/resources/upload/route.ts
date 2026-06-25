import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../_lib';
import { createMuxDirectUpload, isMuxConfigured, isVideoMimeType, uploadFileToMux } from '@/lib/mux/server';

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

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow any authenticated user to upload a file. Admins keep full privileges.
    // Uploaded files will be associated with the uploader via the file path.

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `File type ${file.type} is not allowed` }, { status: 400 });
    }

    // No client-enforced file size limit here — accept files of any size

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const folder = category || 'uncategorized';

    // Video uploads are routed to Mux when credentials are available.
    // The resulting file_path stores the upload id marker, then webhook finalizes playback URL.
    if (isVideoMimeType(file.type) && isMuxConfigured()) {
      try {
        const { uploadId, uploadUrl } = await createMuxDirectUpload({
          contentType: file.type,
          fileName: file.name,
        });
        await uploadFileToMux(uploadUrl, file);

        return NextResponse.json({
          data: {
            filePath: `mux-upload:${uploadId}`,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            provider: 'mux',
          },
        });
      } catch (muxError) {
        console.error('Error uploading video to Mux:', muxError);
        return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
      }
    }

    // Scope uploads by uploader to make ownership and cleanup easier
    const filePath = `resources/${user.id}/${folder}/${timestamp}_${sanitizedFileName}`;

    // Upload to Supabase Storage using admin client to bypass storage RLS
    // (user is already verified as admin above).
    const adminClient = createSupabaseAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await adminClient.storage
      .from('resources-library')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        filePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/resources/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
