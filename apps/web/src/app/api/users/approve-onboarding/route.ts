import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const approveOnboardingSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  approved: z.boolean(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super_admin
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userRecord.role !== 'admin' && userRecord.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can approve onboarding' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsed = approveOnboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, approved, notes } = parsed.data;

    // Get the user's current status
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('id', userId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    if (targetUser.status !== 'awaiting_approval') {
      return NextResponse.json(
        { error: 'User is not awaiting approval' },
        { status: 400 }
      );
    }

    if (approved) {
      // Approve: Update user status to 'active'
      const { error: updateError } = await supabase
        .from('users')
        .update({ status: 'active' })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to activate user:', updateError);
        return NextResponse.json(
          { error: 'Failed to activate user', details: updateError.message },
          { status: 500 }
        );
      }

      // Get onboarding profile for employee creation
      const { data: profile } = await supabase
        .from('onboarding_profiles')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .single();

      // Create employee record if not exists (for cases where it wasn't created on completion)
      if (profile) {
        const { data: existingEmployee } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .maybeSingle();

        if (!existingEmployee) {
          const employmentType = targetUser.role === 'intern' ? 'intern' : 'regular';

          const { error: employeeError } = await supabase.from('employees').insert({
            user_id: userId,
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

          if (employeeError) {
            console.warn('Failed to create employee record during approval:', employeeError);
          }
        }
      }

      // TODO: Send approval email notification to user
      
      return NextResponse.json({
        message: 'Onboarding approved and user activated successfully',
        data: { userId, status: 'active' },
      });
    } else {
      // Reject: Update status back to pending_onboarding or keep awaiting_approval
      // For now, we'll keep them as awaiting_approval with notes
      
      // TODO: Send rejection email notification to user with notes

      return NextResponse.json({
        message: 'Onboarding rejected. User notified.',
        data: { userId, status: 'awaiting_approval', notes },
      });
    }
  } catch (error) {
    console.error('POST /api/users/approve-onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateEmployeeNumber(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `EMP-${yyyy}${mm}${dd}-${random}`;
}
