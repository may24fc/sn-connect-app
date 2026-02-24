import { completeOnboardingSchema } from '@/lib/schemas/onboarding.schema';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedOnboardingContext } from '../../_lib';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = completeOnboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('onboarding_profiles')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Onboarding profile not found' }, { status: 404 });
    }

    const { data: documents } = await supabase
      .from('onboarding_documents')
      .select('id')
      .eq('onboarding_profile_id', profile.id)
      .is('deleted_at', null);

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'Please upload required documents before completing onboarding' },
        { status: 400 }
      );
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('onboarding_profiles')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        current_step: 'review',
      })
      .eq('id', profile.id)
      .select('*')
      .single();

    if (updateError || !updatedProfile) {
      return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
    }

    // Update user status to awaiting_approval for credentials-first flow.
    // Use admin client to avoid RLS blocking self-service status escalation.
    const supabaseAdmin = createSupabaseAdminClient();
    const { error: statusUpdateError } = await supabaseAdmin
      .from('users')
      .update({ status: 'awaiting_approval' })
      .eq('id', user.id);

    if (statusUpdateError) {
      console.error('Failed to update user status to awaiting_approval:', statusUpdateError);
      // Continue anyway - the profile is marked complete
    }

    return NextResponse.json({ data: updatedProfile });
  } catch (error) {
    console.error('POST /api/onboarding/profile/complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
