import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedOnboardingContext, isOnboardingAdmin } from '../../../_lib';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: document, error: queryError } = await supabase
      .from('onboarding_documents')
      .select('id, file_path, file_name, onboarding_profiles(user_id)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (queryError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const profileRelation = (
      document as {
        onboarding_profiles?: { user_id?: string } | Array<{ user_id?: string }> | null;
      }
    ).onboarding_profiles;
    const ownerId = Array.isArray(profileRelation)
      ? profileRelation[0]?.user_id
      : profileRelation?.user_id;

    if (!(isOnboardingAdmin(role) || ownerId === user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from('onboarding-documents')
      .createSignedUrl(document.file_path, 60 * 10);

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Failed to generate preview URL' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        id: document.id,
        fileName: document.file_name,
        signedUrl: signed.signedUrl,
      },
    });
  } catch (error) {
    console.error('GET /api/onboarding/documents/[id]/preview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
