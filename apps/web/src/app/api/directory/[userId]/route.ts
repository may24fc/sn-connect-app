import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * GET /api/directory/[userId]
 * Get full employee/associate details from the directory view + employee table
 * Permissions: admin/super_admin only
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    let role: string | null = null;
    if (typeof user.app_metadata?.db_role === 'string') {
      role = user.app_metadata.db_role;
    }
    if (!role) {
      const { data: roleData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      role = roleData?.role ?? null;
    }

    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch from employee_directory view
    const { data: directoryEntry, error: dirError } = await supabase
      .from('employee_directory')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (dirError) {
      return NextResponse.json(
        { error: 'Failed to fetch directory entry', details: dirError.message },
        { status: 500 }
      );
    }

    if (!directoryEntry) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get the auth user email as fallback
    const { data: authUserData } = await supabase.auth.admin.getUserById(userId);

    const [latestOnboardingProfileResult, latestInternshipResult] = await Promise.all([
      supabase
        .from('onboarding_profiles')
        .select(
          'birthday, nationality, education, major, address, linkedin_profile_url, emergency_contact_name, emergency_contact_number, emergency_contact_relationship, payment_bank_name, payment_account_name, payment_account_number, payment_email, payment_phone_number, payment_address, payment_city, payment_province, payment_zipcode, contact_number, email_address, personal_email'
        )
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      directoryEntry.employee_id
        ? supabase
            .from('internships')
            .select(
              'id, status, completed_hours, required_hours, school, program, start_date, end_date'
            )
            .eq('employee_id', directoryEntry.employee_id)
            .is('deleted_at', null)
            .order('status', { ascending: true })
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const latestOnboardingProfile = latestOnboardingProfileResult.data;
    const latestInternship = latestInternshipResult.data;

    // Fetch pending change requests for this employee
    let pendingChanges: Array<{
      id: string;
      changes: Record<string, { old: string | null; new: string | null }>;
      requested_at: string;
      status: string;
    }> = [];

    if (directoryEntry.employee_id) {
      const { data: changes } = await supabase
        .from('profile_change_requests')
        .select('id, changes, requested_at, status, review_note, reviewed_at, reviewed_by')
        .eq('employee_id', directoryEntry.employee_id)
        .is('deleted_at', null)
        .order('requested_at', { ascending: false })
        .limit(20);

      pendingChanges = (changes ?? []) as typeof pendingChanges;
    }

    return NextResponse.json({
      data: {
        ...directoryEntry,
        avatar_url:
          directoryEntry.avatar_url ?? authUserData?.user?.user_metadata?.avatar_url ?? null,
        email:
          directoryEntry.email ?? authUserData?.user?.email ?? latestOnboardingProfile?.email_address ?? null,
        contact_number:
          directoryEntry.contact_number ?? latestOnboardingProfile?.contact_number ?? null,
        birthday: directoryEntry.birthday ?? latestOnboardingProfile?.birthday ?? null,
        nationality: directoryEntry.nationality ?? latestOnboardingProfile?.nationality ?? null,
        education:
          directoryEntry.education ??
          ([latestOnboardingProfile?.education, latestOnboardingProfile?.major]
            .filter(Boolean)
            .join(' · ') || null),
        address: directoryEntry.address ?? latestOnboardingProfile?.address ?? null,
        linkedin_profile_url:
          directoryEntry.linkedin_profile_url ?? latestOnboardingProfile?.linkedin_profile_url ?? null,
        emergency_contact_name:
          directoryEntry.emergency_contact_name ?? latestOnboardingProfile?.emergency_contact_name ?? null,
        emergency_contact_number:
          directoryEntry.emergency_contact_number ?? latestOnboardingProfile?.emergency_contact_number ?? null,
        emergency_contact_relationship:
          directoryEntry.emergency_contact_relationship ??
          latestOnboardingProfile?.emergency_contact_relationship ??
          null,
        personal_email:
          directoryEntry.personal_email ?? latestOnboardingProfile?.personal_email ?? null,
        payment_bank_name: latestOnboardingProfile?.payment_bank_name ?? null,
        payment_account_name:
          directoryEntry.payment_account_name ?? latestOnboardingProfile?.payment_account_name ?? null,
        payment_account_number:
          directoryEntry.payment_account_number ?? latestOnboardingProfile?.payment_account_number ?? null,
        payment_email: directoryEntry.payment_email ?? latestOnboardingProfile?.payment_email ?? null,
        payment_phone_number:
          directoryEntry.payment_phone_number ?? latestOnboardingProfile?.payment_phone_number ?? null,
        payment_address:
          directoryEntry.payment_address ?? latestOnboardingProfile?.payment_address ?? null,
        payment_city: directoryEntry.payment_city ?? latestOnboardingProfile?.payment_city ?? null,
        payment_province:
          directoryEntry.payment_province ?? latestOnboardingProfile?.payment_province ?? null,
        payment_zipcode:
          directoryEntry.payment_zipcode ?? latestOnboardingProfile?.payment_zipcode ?? null,
        internship_id: directoryEntry.internship_id ?? latestInternship?.id ?? null,
        internship_status: directoryEntry.internship_status ?? latestInternship?.status ?? null,
        completed_hours: directoryEntry.completed_hours ?? latestInternship?.completed_hours ?? null,
        required_hours: directoryEntry.required_hours ?? latestInternship?.required_hours ?? null,
        school: directoryEntry.school ?? latestInternship?.school ?? null,
        program: directoryEntry.program ?? latestInternship?.program ?? null,
        start_date: directoryEntry.start_date ?? latestInternship?.start_date ?? null,
        pending_change_requests: pendingChanges,
      },
    });
  } catch (err) {
    console.error('Error in GET /api/directory/[userId]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
