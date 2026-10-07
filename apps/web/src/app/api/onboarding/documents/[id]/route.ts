import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedOnboardingContext, isOnboardingAdmin } from '../../_lib';

type ProfileRelation = {
  user_id?: string;
  is_completed?: boolean;
  review_state?: string | null;
};

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsedId = z
      .string()
      .uuid()
      .safeParse((await params).id);
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    const id = parsedId.data;
    const { supabase, user, role, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: document, error: documentError } = await supabase
      .from('onboarding_documents')
      .select(
        'id, file_path, onboarding_profile_id, onboarding_profiles(user_id, is_completed, review_state)'
      )
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const profileRelation = (
      document as {
        onboarding_profiles?: ProfileRelation | Array<ProfileRelation> | null;
      }
    ).onboarding_profiles;
    const profile = Array.isArray(profileRelation) ? profileRelation[0] : profileRelation;
    const isAdmin = isOnboardingAdmin(role);

    if (!(isAdmin || profile?.user_id === user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Employees may change their uploads while setting up, or after HR sends the
    // submission back. Once it is submitted for review or approved, the files are locked.
    const canEmployeeEdit = !profile?.is_completed || profile.review_state === 'rejected';
    if (!(isAdmin || canEmployeeEdit)) {
      return NextResponse.json(
        { error: 'Documents can no longer be removed after onboarding is submitted for review' },
        { status: 409 }
      );
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
