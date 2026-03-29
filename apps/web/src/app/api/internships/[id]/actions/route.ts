import { internshipActionSchema } from '@/lib/schemas/internship.schema';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { canAccessInternship, getAuthedInternshipContext, isInternshipAdmin } from '../../_lib';

interface InternshipRecord {
  id: string;
  employee_id: string;
  status: string;
}

interface EmployeeRecord {
  id: string;
  user_id: string;
  employment_type: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toInternshipRecord(value: Record<string, unknown>): InternshipRecord | null {
  const internshipId = value.id;
  const employeeId = value.employee_id;
  const status = value.status;

  if (
    typeof internshipId !== 'string' ||
    typeof employeeId !== 'string' ||
    typeof status !== 'string'
  ) {
    return null;
  }

  return {
    id: internshipId,
    employee_id: employeeId,
    status,
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedInternshipContext();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isInternshipAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const access = await canAccessInternship(supabase, id, user.id, role);
    if (!access.allowed || !access.internship) {
      return NextResponse.json({ error: 'Internship not found' }, { status: 404 });
    }

    const parsedBody = internshipActionSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();
    const internship = toInternshipRecord(access.internship);
    if (!internship) {
      return NextResponse.json({ error: 'Internship not found' }, { status: 404 });
    }

    if (parsedBody.data.action === 'end_internship') {
      const { data: updatedInternship, error: endError } = await adminClient
        .from('internships')
        .update({
          status: 'completed',
          updated_at: nowIso(),
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id, status')
        .single();

      if (endError || !updatedInternship) {
        console.error('Failed to end internship:', endError);
        return NextResponse.json({ error: 'Failed to end internship' }, { status: 500 });
      }

      await adminClient.from('audit_logs').insert({
        table_name: 'internships',
        record_id: id,
        operation: 'UPDATE',
        action: 'end_internship',
        old_values: { status: internship.status },
        new_values: { status: 'completed' },
        metadata: {
          internshipId: id,
          employeeId: internship.employee_id,
          previousStatus: internship.status,
          newStatus: 'completed',
        },
        performed_by: user.id,
      });

      return NextResponse.json({
        data: {
          internshipId: updatedInternship.id,
          status: 'completed',
        },
      });
    }

    const { data: employee, error: employeeError } = await adminClient
      .from('employees')
      .select('id, user_id, employment_type')
      .eq('id', internship.employee_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (employeeError || !employee) {
      console.error('Failed to resolve employee for conversion:', employeeError);
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    const typedEmployee = employee as EmployeeRecord;

    const [{ error: convertError }, { error: userRoleError }, { error: employmentTypeError }] =
      await Promise.all([
        adminClient
          .from('internships')
          .update({ status: 'converted', updated_at: nowIso() })
          .eq('id', id)
          .is('deleted_at', null),
        adminClient
          .from('users')
          .update({ role: 'employee', updated_at: nowIso() })
          .eq('id', typedEmployee.user_id)
          .is('deleted_at', null),
        adminClient
          .from('employees')
          .update({ employment_type: 'probationary', updated_at: nowIso() })
          .eq('id', typedEmployee.id)
          .is('deleted_at', null),
      ]);

    if (convertError || userRoleError || employmentTypeError) {
      console.error('Failed to convert intern to employee:', {
        convertError,
        userRoleError,
        employmentTypeError,
      });
      return NextResponse.json({ error: 'Failed to hire intern as employee' }, { status: 500 });
    }

    const { data: existingOtherMetadata } = await adminClient
      .from('user_role_metadata')
      .select('metadata')
      .eq('user_id', typedEmployee.user_id)
      .eq('role_type', 'other')
      .maybeSingle();

    const mergedMetadata = {
      ...(existingOtherMetadata?.metadata ?? {}),
      role: 'employee',
      converted_from: 'intern',
      internship_id: id,
      employment_type: 'probationary',
      converted_at: nowIso(),
    };

    await adminClient
      .from('user_role_metadata')
      .upsert(
        {
          user_id: typedEmployee.user_id,
          role_type: 'other',
          metadata: mergedMetadata,
          updated_at: nowIso(),
        },
        { onConflict: 'user_id,role_type' }
      );

    await adminClient.from('audit_logs').insert({
      table_name: 'internships',
      record_id: id,
      operation: 'UPDATE',
      action: 'hire_as_employee',
      old_values: {
        internship_status: internship.status,
        user_role: 'intern',
        employment_type: typedEmployee.employment_type,
      },
      new_values: {
        internship_status: 'converted',
        user_role: 'employee',
        employment_type: 'probationary',
      },
      metadata: {
        internshipId: id,
        employeeId: typedEmployee.id,
        userId: typedEmployee.user_id,
      },
      performed_by: user.id,
    });

    return NextResponse.json({
      data: {
        internshipId: id,
        status: 'converted',
        userId: typedEmployee.user_id,
        employeeId: typedEmployee.id,
        userRole: 'employee',
        employmentType: 'probationary',
      },
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/internships/[id]/actions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
