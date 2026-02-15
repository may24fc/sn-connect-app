import { onboardingDocumentTypeSchema } from '@/lib/schemas/onboarding.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedOnboardingContext } from '../_lib';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function GET() {
  try {
    const { supabase, user, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('onboarding_profiles')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!profile?.id) {
      return NextResponse.json({ data: [] });
    }

    const { data, error: queryError } = await supabase
      .from('onboarding_documents')
      .select('*')
      .eq('onboarding_profile_id', profile.id)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false });

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch onboarding documents' }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('GET /api/onboarding/documents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const documentTypeRaw = formData.get('documentType');

    if (!(file instanceof File) || typeof documentTypeRaw !== 'string') {
      return NextResponse.json({ error: 'file and documentType are required' }, { status: 400 });
    }

    const documentTypeParse = onboardingDocumentTypeSchema.safeParse(documentTypeRaw);
    if (!documentTypeParse.success) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 });
    }

    let { data: profile } = await supabase
      .from('onboarding_profiles')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!profile?.id) {
      const { data: createdProfile, error: createProfileError } = await supabase
        .from('onboarding_profiles')
        .insert({ user_id: user.id, current_step: 'documents' })
        .select('id')
        .single();

      if (createProfileError || !createdProfile) {
        return NextResponse.json({ error: 'Failed to create onboarding profile' }, { status: 500 });
      }

      profile = createdProfile;
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
    const storagePath = `${user.id}/${documentTypeParse.data}-${timestamp}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('onboarding-documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
    }

    await supabase
      .from('onboarding_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('onboarding_profile_id', profile.id)
      .eq('document_type', documentTypeParse.data)
      .is('deleted_at', null);

    const { data, error: insertError } = await supabase
      .from('onboarding_documents')
      .insert({
        onboarding_profile_id: profile.id,
        document_type: documentTypeParse.data,
        file_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select('*')
      .single();

    if (insertError || !data) {
      return NextResponse.json({ error: 'Failed to save document metadata' }, { status: 500 });
    }

    await supabase
      .from('onboarding_profiles')
      .update({ current_step: 'documents' })
      .eq('id', profile.id);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/onboarding/documents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
