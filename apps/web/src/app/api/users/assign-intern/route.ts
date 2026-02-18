import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const assignInternSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  department: z.string().min(1, 'Department is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format'),
  requiredHours: z.number().min(1, 'Required hours must be at least 1'),
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

    const { userId, department, startDate, endDate, requiredHours, school, program } =
      parsed.data;

    // Validate date range
    if (new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Failed to fetch employee record' },
        { status: 500 }
      );
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee record not found. Please ensure onboarding was approved first.' },
        { status: 404 }
      );
    }

    // Update employee department
    const { error: updateEmployeeError } = await supabase
      .from('employees')
      .update({
        department,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employee.id);

    if (updateEmployeeError) {
      console.error('Failed to update employee:', updateEmployeeError);
      return NextResponse.json(
        { error: 'Failed to update employee department' },
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
      const supabaseAdmin = createSupabaseAdminClient();
      const { error: updateError } = await supabaseAdmin
        .from('internships')
        .update({
          start_date: startDate,
          end_date: endDate,
          required_hours: requiredHours,
          department,
          school: school || null,
          program: program || null,
          status: 'active',
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
          department,
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
          department,
          startDate,
          endDate,
        },
      });
    }

    // Create new internship record using admin client to bypass RLS
    // (user is already verified as admin above)
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: newInternship, error: insertError } = await supabaseAdmin
      .from('internships')
      .insert({
        employee_id: employee.id,
        start_date: startDate,
        end_date: endDate,
        required_hours: requiredHours,
        completed_hours: 0,
        status: 'active',
        department,
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
        department,
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
        department,
        startDate,
        endDate,
        requiredHours,
      },
    });
  } catch (error) {
    console.error('POST /api/users/assign-intern error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
