import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveDepartmentById, resolveDivisionById } from '../_organization';

const assignEmployeeSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  departmentId: z.string().uuid('Department is required'),
  divisionId: z.string().uuid('Division is required'),
  assignProbation: z.boolean().default(true),
  stage: z.number().min(1).max(3, 'Probation stage must be between 1 and 3').optional(),
  status: z.enum(['on-track', 'at-risk']).optional(),
  probationEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

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

    const { userId, departmentId, divisionId, assignProbation, stage, status, probationEndDate } =
      parsed.data;

    if (assignProbation && (!stage || !status || !probationEndDate)) {
      return NextResponse.json(
        {
          error:
            'Validation failed: probation stage, status, and probationEndDate are required for probationary employees',
        },
        { status: 400 }
      );
    }

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

    const [resolvedDepartment, resolvedDivision] = await Promise.all([
      resolveDepartmentById(supabaseAdmin, departmentId),
      resolveDivisionById(supabaseAdmin, divisionId),
    ]);

    // Update employee record with probation details
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({
        department: resolvedDepartment.name,
        division: resolvedDivision.name,
        probation_end_date: assignProbation ? probationEndDate : null,
        employment_type: assignProbation ? 'probationary' : 'regular',
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

    const { error: updateUserError } = await supabaseAdmin
      .from('users')
      .update({
        department_id: resolvedDepartment.id,
        division_id: resolvedDivision.id,
      })
      .eq('id', userId);

    if (updateUserError) {
      console.error('Failed to sync user department:', updateUserError);
      return NextResponse.json(
        { error: 'Failed to sync user department', details: updateUserError.message },
        { status: 500 }
      );
    }

    const employmentStatus = assignProbation ? 'probationary' : 'confirmed';

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      table_name: 'employees',
      record_id: employee.id,
      operation: 'UPDATE',
      new_values: {
        department: resolvedDepartment.name,
        department_id: resolvedDepartment.id,
        division: resolvedDivision.name,
        division_id: resolvedDivision.id,
        probation_end_date: assignProbation ? probationEndDate : null,
        probation_stage: assignProbation ? stage : null,
        probation_status: assignProbation ? status : null,
        assign_probation: assignProbation,
        employment_type: assignProbation ? 'probationary' : 'regular',
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      },
      performed_by: user.id,
    });

    return NextResponse.json({
      message: assignProbation
        ? 'Employee assigned as probationary successfully'
        : 'Employee assigned as confirmed successfully',
      data: {
        employeeId: employee.id,
        userId,
        department: resolvedDepartment.name,
        departmentId: resolvedDepartment.id,
        division: resolvedDivision.name,
        divisionId: resolvedDivision.id,
        employmentStatus,
        assignProbation,
        ...(assignProbation
          ? {
              stage,
              status,
              probationEndDate,
            }
          : {}),
      },
    });
  } catch (error) {
    console.error('POST /api/users/assign-employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
