import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedOnboardingContext, isOnboardingAdmin } from '../../_lib';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: document, error: documentError } = await supabase
      .from('onboarding_documents')
      .select('id, file_path, onboarding_profile_id, onboarding_profiles(user_id)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (documentError || !document) {
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

    const { error: deleteError } = await supabase
      .from('onboarding_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete document metadata' }, { status: 500 });
    }

    if (document.file_path) {
      await supabase.storage.from('onboarding-documents').remove([document.file_path]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/onboarding/documents/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
