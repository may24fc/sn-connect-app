import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveDepartmentById, resolveDivisionById } from '../_organization';

const assignInternSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  departmentId: z.string().uuid('Department is required'),
  divisionId: z.string().uuid('Division is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format'),
  requiredHours: z.number().min(1, 'Required hours must be at least 1'),
  weeklyRequiredHours: z.number().min(1, 'Weekly required hours must be at least 1').default(20),
  school: z.string().optional(),
  program: z.string().optional(),
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
        { error: 'Forbidden: Only admins can assign interns' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsed = assignInternSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, departmentId, divisionId, startDate, endDate, requiredHours, weeklyRequiredHours, school, program } = parsed.data;

    // Validate date range
    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    // Get the employee record (interns are also in the employees table)
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

    const supabaseAdmin = createSupabaseAdminClient();
    const [resolvedDepartment, resolvedDivision] = await Promise.all([
      resolveDepartmentById(supabaseAdmin, departmentId),
      resolveDivisionById(supabaseAdmin, divisionId),
    ]);

    // Update employee department
    const { error: updateEmployeeError } = await supabaseAdmin
      .from('employees')
      .update({
        department: resolvedDepartment.name,
        division: resolvedDivision.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employee.id);

    if (updateEmployeeError) {
      console.error('Failed to update employee:', updateEmployeeError);
      return NextResponse.json({ error: 'Failed to update employee department' }, { status: 500 });
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

    // Check if internship record already exists
    const { data: existingInternship } = await supabase
      .from('internships')
      .select('id')
      .eq('employee_id', employee.id)
      .maybeSingle();

    if (existingInternship) {
      // Update existing internship using admin client to bypass RLS
      // (user is already verified as admin above)
      const { error: updateError } = await supabaseAdmin
        .from('internships')
        .update({
          start_date: startDate,
          end_date: endDate,
          required_hours: requiredHours,
          weekly_required_hours: weeklyRequiredHours,
          status: 'active',
          department: resolvedDepartment.name,
          division: resolvedDivision.name,
          school: school || null,
          program: program || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingInternship.id);

      if (updateError) {
        console.error('Failed to update internship:', updateError);
        return NextResponse.json(
          { error: 'Failed to update internship', details: updateError.message },
          { status: 500 }
        );
      }

      await supabase.from('audit_logs').insert({
        table_name: 'internships',
        record_id: existingInternship.id,
        operation: 'UPDATE',
        new_values: {
          start_date: startDate,
          end_date: endDate,
          required_hours: requiredHours,
          department: resolvedDepartment.name,
          department_id: resolvedDepartment.id,
          division: resolvedDivision.name,
          division_id: resolvedDivision.id,
          school,
          program,
          assigned_by: user.id,
        },
        performed_by: user.id,
      });

      return NextResponse.json({
        message: 'Internship updated successfully',
        data: {
          internshipId: existingInternship.id,
          employeeId: employee.id,
          userId,
          department: resolvedDepartment.name,
          departmentId: resolvedDepartment.id,
          division: resolvedDivision.name,
          divisionId: resolvedDivision.id,
          startDate,
          endDate,
        },
      });
    }

    // Create new internship record using admin client to bypass RLS
    // (user is already verified as admin above)
    const { data: newInternship, error: insertError } = await supabaseAdmin
      .from('internships')
      .insert({
        employee_id: employee.id,
        start_date: startDate,
        end_date: endDate,
        required_hours: requiredHours,
        weekly_required_hours: weeklyRequiredHours,
        completed_hours: 0,
        status: 'active',
        department: resolvedDepartment.name,
        division: resolvedDivision.name,
        school: school || null,
        program: program || null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to create internship:', insertError);
      return NextResponse.json(
        { error: 'Failed to create internship', details: insertError.message },
        { status: 500 }
      );
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      table_name: 'internships',
      record_id: newInternship.id,
      operation: 'INSERT',
      new_values: {
        employee_id: employee.id,
        start_date: startDate,
        end_date: endDate,
        required_hours: requiredHours,
        department: resolvedDepartment.name,
        department_id: resolvedDepartment.id,
        division: resolvedDivision.name,
        division_id: resolvedDivision.id,
        school,
        program,
        assigned_by: user.id,
      },
      performed_by: user.id,
    });

    return NextResponse.json({
      message: 'Internship assigned successfully',
      data: {
        internshipId: newInternship.id,
        employeeId: employee.id,
        userId,
        department: resolvedDepartment.name,
        departmentId: resolvedDepartment.id,
        division: resolvedDivision.name,
        divisionId: resolvedDivision.id,
        startDate,
        endDate,
        requiredHours,
      },
    });
  } catch (error) {
    console.error('POST /api/users/assign-associate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
