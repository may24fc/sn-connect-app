import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const BUCKET = 'marketing-content-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function getAuthenticatedUser(): Promise<{ id: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const path = request.nextUrl.searchParams.get('path') || '';
    const role = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : '';
    const isAdmin = role === 'admin' || role === 'super_admin';
    if (!path.startsWith(`${user.id}/`) && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await createSupabaseAdminClient()
      .storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (error || !data) return NextResponse.json({ error: 'Failed to load image preview' }, { status: 500 });

    return NextResponse.json({ data: { signedUrl: data.signedUrl } });
  } catch (error) {
    console.error('Unexpected error loading marketing content image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const file = (await request.formData()).get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'An image file is required' }, { status: 400 });
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are supported' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Image must be 5MB or smaller' }, { status: 400 });
    }

    const extension = file.type.split('/')[1];
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const storage = createSupabaseAdminClient().storage.from(BUCKET);
    const { error: uploadError } = await storage.upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      console.error('Marketing content image upload failed:', uploadError);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    const { data: signedUrl, error: signedUrlError } = await storage.createSignedUrl(path, 60 * 60);
    if (signedUrlError || !signedUrl) {
      await storage.remove([path]);
      return NextResponse.json({ error: 'Failed to prepare image preview' }, { status: 500 });
    }

    return NextResponse.json({ data: { path, signedUrl: signedUrl.signedUrl } }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error uploading marketing content image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { path?: unknown };
    const path = typeof body.path === 'string' ? body.path : '';
    if (!path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Invalid image path' }, { status: 400 });
    }

    const { error } = await createSupabaseAdminClient().storage.from(BUCKET).remove([path]);
    if (error) return NextResponse.json({ error: 'Failed to remove image' }, { status: 500 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Unexpected error removing marketing content image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}