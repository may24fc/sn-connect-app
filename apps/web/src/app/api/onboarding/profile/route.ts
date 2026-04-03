import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedOnboardingContext } from '../_lib';

export async function GET() {
  try {
    const { supabase, user, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error: queryError } = await supabase
      .from('onboarding_profiles')
      .select('*, departments(id, name)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (queryError) {
      console.error('Failed to fetch onboarding profile:', queryError);
      return NextResponse.json(
        {
          error: 'Failed to fetch onboarding profile',
          details: process.env.NODE_ENV === 'development' ? queryError.message : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? null });
  } catch (error) {
    console.error('GET /api/onboarding/profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const { data: existing } = await supabase
      .from('onboarding_profiles')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ data: existing });
    }

    // Check for a soft-deleted profile (e.g. from a privileged admin/super_admin
    // invite) and restore it instead of attempting a duplicate insert.
    const { data: softDeleted } = await supabase
      .from('onboarding_profiles')
      .select('*')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .maybeSingle();

    if (softDeleted) {
      const { data: restored, error: restoreError } = await supabase
        .from('onboarding_profiles')
        .update({
          deleted_at: null,
          is_completed: false,
          completed_at: null,
          current_step: 'personal_info',
          first_name: typeof body.firstName === 'string' ? body.firstName : softDeleted.first_name,
          middle_name: typeof body.middleName === 'string' ? body.middleName : softDeleted.middle_name,
          last_name: typeof body.lastName === 'string' ? body.lastName : softDeleted.last_name,
          email_address: typeof body.emailAddress === 'string' ? body.emailAddress : softDeleted.email_address,
        })
        .eq('id', softDeleted.id)
        .select('*')
        .single();

      if (restoreError) {
        console.error('Failed to restore soft-deleted onboarding profile:', restoreError);
        return NextResponse.json(
          {
            error: 'Failed to create onboarding profile',
            details: process.env.NODE_ENV === 'development' ? restoreError.message : undefined,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: restored }, { status: 201 });
    }

    const { data, error: insertError } = await supabase
      .from('onboarding_profiles')
      .insert({
        user_id: user.id,
        current_step: 'personal_info',
        first_name: typeof body.firstName === 'string' ? body.firstName : null,
        middle_name: typeof body.middleName === 'string' ? body.middleName : null,
        last_name: typeof body.lastName === 'string' ? body.lastName : null,
        email_address: typeof body.emailAddress === 'string' ? body.emailAddress : null,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Failed to create onboarding profile:', insertError);
      return NextResponse.json(
        {
          error: 'Failed to create onboarding profile',
          details: process.env.NODE_ENV === 'development' ? insertError.message : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/onboarding/profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
