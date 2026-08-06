import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/employees/[id]/payment-details
 * Get payment details for an employee (requires auth)
 * Fetches from both employees and onboarding_profiles tables
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch employee with user_id
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, user_id, first_name, last_name')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Fetch onboarding profile by user_id to get all payment details
    const { data: profile, error: profileError } = await supabase
      .from('onboarding_profiles')
      .select(
        'payment_bank_name, payment_country_code, payment_account_name, payment_account_number, payment_email, payment_phone_number, payment_city, payment_province, payment_zipcode'
      )
      .eq('user_id', employee.user_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (profileError) {
      console.error('Failed to fetch onboarding profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch payment details', details: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        payment_bank_name: profile?.payment_bank_name ?? null,
        payment_country_code: profile?.payment_country_code ?? 'PH',
        payment_account_name: profile?.payment_account_name ?? null,
        payment_account_number: profile?.payment_account_number ?? null,
        payment_email: profile?.payment_email ?? null,
        payment_phone_number: profile?.payment_phone_number ?? null,
        payment_city: profile?.payment_city ?? null,
        payment_province: profile?.payment_province ?? null,
        payment_zipcode: profile?.payment_zipcode ?? null,
      },
    });
  } catch (error) {
    console.error('GET /api/employees/[id]/payment-details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
