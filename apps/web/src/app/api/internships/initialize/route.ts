import { initializeInternshipSchema } from '@/lib/schemas/internship.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedInternshipContext, resolveEmployeeByUserId } from '../_lib';

/**
 * POST /api/internships/initialize
 *
 * Creates an internship record for the authenticated intern user.
 * - Validates the user has role `intern`
 * - Prevents duplicate records (only one active internship per employee)
 * - Links the internship to the user's employee record
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, user, role, error } = await getAuthedInternshipContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only interns can self-initialize (admins use the regular POST /api/internships)
    if (role !== 'intern') {
      return NextResponse.json(
        { error: 'Only users with the intern role can initialize an internship' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = initializeInternshipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // Resolve the employee record for the current user
    const { data: employee, error: employeeError } = await resolveEmployeeByUserId(
      supabase,
      user.id
    );

    if (employeeError || !employee) {
      return NextResponse.json(
        {
          error:
            'No employee record found for your account. Please contact HR to complete your account setup.',
        },
        { status: 404 }
      );
    }

    // Check for existing active internship (prevent duplicates)
    const { data: existingInternship } = await supabase
      .from('internships')
      .select('id, status')
      .eq('employee_id', employee.id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (existingInternship) {
      return NextResponse.json(
        {
          error: 'You already have an active internship record',
          existingId: existingInternship.id,
        },
        { status: 409 }
      );
    }

    // Create the internship record
    const { data: internship, error: insertError } = await supabase
      .from('internships')
      .insert({
        employee_id: employee.id,
        start_date: payload.startDate,
        end_date: payload.endDate,
        required_hours: payload.requiredHours,
        completed_hours: 0,
        status: 'active',
        department: payload.department,
        school: payload.school,
        program: payload.program,
        supervisor_id: null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (insertError || !internship) {
      console.error('Error creating internship via self-initialization:', insertError);
      return NextResponse.json({ error: 'Failed to create internship record' }, { status: 500 });
    }

    // Log the initialization to audit trail
    try {
      await supabase.from('audit_logs').insert({
        action: 'intern_self_initialized',
        table_name: 'internships',
        record_id: internship.id,
        user_id: user.id,
        new_values: {
          employee_id: employee.id,
          start_date: payload.startDate,
          end_date: payload.endDate,
          department: payload.department,
          school: payload.school,
          program: payload.program,
          required_hours: payload.requiredHours,
        },
      });
    } catch (auditError) {
      // Audit logging failure should not block the response
      console.warn('Failed to write audit log for intern initialization:', auditError);
    }

    return NextResponse.json({ data: internship }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in POST /api/internships/initialize:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
