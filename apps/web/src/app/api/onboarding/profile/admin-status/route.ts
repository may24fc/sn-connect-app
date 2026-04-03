import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/onboarding/profile/admin-status
 *
 * Returns { needsSetup: boolean } indicating whether the current
 * admin / super-admin user still needs to complete their profile wizard.
 *
 * Detection logic:
 * 1. If the user has a completed onboarding_profile → needsSetup = false
 * 2. Else, if the employee record is missing key fields → needsSetup = true
 * 3. Otherwise → needsSetup = false (employee record is sufficiently filled)
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ needsSetup: false });
    }

    // Check for a completed onboarding profile
    const { data: completedProfile } = await supabase
      .from('onboarding_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (completedProfile) {
      return NextResponse.json({ needsSetup: false });
    }

    // Check employee record for missing key fields
    const { data: employee } = await supabase
      .from('employees')
      .select('id, birthday, emergency_contact_name, personal_email, phone')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!employee) {
      // No employee record at all — they might need setup
      return NextResponse.json({ needsSetup: true });
    }

    // If key personal fields are missing, prompt for setup
    const isMissingKeyFields =
      !employee.birthday ||
      !employee.emergency_contact_name ||
      !employee.personal_email;

    return NextResponse.json({ needsSetup: isMissingKeyFields });
  } catch (error) {
    console.error('GET /api/onboarding/profile/admin-status error:', error);
    return NextResponse.json({ needsSetup: false });
  }
}
