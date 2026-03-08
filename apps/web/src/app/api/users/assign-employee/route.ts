import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const assignEmployeeSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  department: z.string().min(1, 'Department is required'),
  stage: z.number().min(1).max(4, 'Stage must be between 1 and 4'),
  status: z.enum(['on-track', 'at-risk']),
  probationEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
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

    // Check if user has admin privileges (admin or super_admin roles after consolidation)
    const allowedRoles = ['admin', 'super_admin'];
    if (!allowedRoles.includes(userRecord.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can assign employees' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsed = assignEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, department, stage, status, probationEndDate } = parsed.data;

    // Get the employee record
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (employeeError) {
      console.error('Failed to fetch employee:', employeeError);
      return NextResponse.json({ error: 'Failed to fetch employee record' }, { status: 500 });
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee record not found. Please ensure onboarding was approved first.' },
        { status: 404 }
      );
    }

    // Update employee record with probation details
    const { error: updateError } = await supabase
      .from('employees')
      .update({
        department,
        probation_end_date: probationEndDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employee.id);

    if (updateError) {
      console.error('Failed to update employee:', updateError);
      return NextResponse.json(
        { error: 'Failed to assign employee', details: updateError.message },
        { status: 500 }
      );
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      table_name: 'employees',
      record_id: employee.id,
      operation: 'UPDATE',
      new_values: {
        department,
        probation_end_date: probationEndDate,
        probation_stage: stage,
        probation_status: status,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      },
      performed_by: user.id,
    });

    return NextResponse.json({
      message: 'Employee assigned to probation tracker successfully',
      data: {
        employeeId: employee.id,
        userId,
        department,
        stage,
        status,
        probationEndDate,
      },
    });
  } catch (error) {
    console.error('POST /api/users/assign-employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
