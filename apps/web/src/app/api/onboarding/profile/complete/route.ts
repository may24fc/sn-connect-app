import { completeOnboardingSchema } from '@/lib/schemas/onboarding.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedOnboardingContext } from '../../_lib';

function generateEmployeeNumber(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `EMP-${yyyy}${mm}${dd}-${random}`;
}

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

    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!existingEmployee?.id) {
      const { data: userRoleData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const employmentType = userRoleData?.role === 'intern' ? 'intern' : 'regular';

      const { error: employeeInsertError } = await supabase.from('employees').insert({
        user_id: user.id,
        employee_number: generateEmployeeNumber(),
        first_name: profile.first_name || 'N/A',
        middle_name: profile.middle_name,
        last_name: profile.last_name || 'N/A',
        birthday: profile.birthday,
        date_hired: profile.start_date || new Date().toISOString().slice(0, 10),
        employment_type: employmentType,
        work_arrangement: 'full_time',
        position: profile.position || 'Employee',
        department: profile.department_id ? 'Assigned Department' : 'Unassigned',
        payroll_account_name: profile.payment_account_name,
        payroll_account_number: profile.payment_account_number,
        phone: profile.contact_number,
        emergency_contact_name: profile.emergency_contact_name,
        emergency_contact_number: profile.emergency_contact_number,
        personal_email: profile.email_address,
        company_email: profile.email_address,
        address: profile.address,
        city: profile.payment_city,
        province: profile.payment_province,
        postal_code: profile.payment_zipcode,
        created_by: user.id,
      });

      if (employeeInsertError) {
        console.warn(
          'Employee record creation skipped/failed during onboarding completion:',
          employeeInsertError.message
        );
      }
    }

    return NextResponse.json({ data: updatedProfile });
  } catch (error) {
    console.error('POST /api/onboarding/profile/complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
