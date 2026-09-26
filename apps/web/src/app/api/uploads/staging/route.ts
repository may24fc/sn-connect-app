import {
  UPLOAD_STAGING_BUCKET,
  UPLOAD_STAGING_MAX_FILES,
  UPLOAD_STAGING_MAX_FILE_SIZE,
} from '@/lib/storage/upload-staging';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const stagingRequestSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(255),
        size: z.number().int().min(0).max(UPLOAD_STAGING_MAX_FILE_SIZE),
      })
    )
    .min(1)
    .max(UPLOAD_STAGING_MAX_FILES),
});

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
}

/**
 * Issues signed upload URLs into the private staging bucket so the browser can
 * upload files without passing them through a Vercel function (4.5 MB body
 * limit). The receiving API route validates and consumes the staged object via
 * `resolveStagedFormData`; this route only scopes uploads to the caller.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = stagingRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      const tooLarge = parsed.error.issues.some(
        (issue) => issue.code === 'too_big' && issue.path.includes('size')
      );
      return NextResponse.json(
        { error: tooLarge ? 'File is larger than the 50 MB upload limit' : 'Invalid request body' },
        { status: 400 }
      );
    }

    const storage = createSupabaseAdminClient().storage.from(UPLOAD_STAGING_BUCKET);
    const targets = await Promise.all(
      parsed.data.files.map(async (file) => {
        const path = `${user.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
        const { data, error } = await storage.createSignedUploadUrl(path);
        if (error || !data) {
          throw new Error('Failed to create signed upload URL');
        }
        return { path: data.path, token: data.token };
      })
    );

    return NextResponse.json({ data: targets });
  } catch (error) {
    console.error('Unexpected error in POST /api/uploads/staging:', error);
    return NextResponse.json({ error: 'Failed to prepare upload' }, { status: 500 });
  }
}
