import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedOnboardingContext, isOnboardingAdmin } from '../../../_lib';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedOnboardingContext();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isOnboardingAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error: queryError } = await supabase
      .from('onboarding_documents')
      .select('*')
      .eq('onboarding_profile_id', id)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false });

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch onboarding documents' }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('GET /api/onboarding/profiles/[id]/documents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
