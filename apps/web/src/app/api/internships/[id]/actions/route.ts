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

function todayInPhDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!(year && month && day)) {
    return new Date().toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function addDaysToDateOnly(dateOnly: string, days: number): string {
  const parts = dateOnly.split('-');
  if (parts.length !== 3) {
    return new Date().toISOString().slice(0, 10);
  }

  const [yearPart, monthPart, dayPart] = parts as [string, string, string];
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (![year, month, day].every((value) => Number.isFinite(value))) {
    return new Date().toISOString().slice(0, 10);
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
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
      // Fetch employee to get user_id so we can revoke their active status
      const { data: employeeForEnd, error: employeeForEndError } = await adminClient
        .from('employees')
        .select('id, user_id')
        .eq('id', internship.employee_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (employeeForEndError || !employeeForEnd) {
        console.error('Failed to resolve employee for internship end:', employeeForEndError);
        return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
      }

      const [{ data: updatedInternship, error: endError }, { error: userStatusError }] =
        await Promise.all([
          adminClient
            .from('internships')
            .update({ status: 'completed', updated_at: nowIso() })
            .eq('id', id)
            .is('deleted_at', null)
            .select('id, status')
            .single(),
          adminClient
            .from('users')
            .update({ status: 'terminated', updated_at: nowIso() })
            .eq('id', (employeeForEnd as { id: string; user_id: string }).user_id)
            .is('deleted_at', null),
        ]);

      if (endError || !updatedInternship) {
        console.error('Failed to end internship:', endError);
        return NextResponse.json({ error: 'Failed to end internship' }, { status: 500 });
      }

      if (userStatusError) {
        console.error('Failed to revoke user status on internship end:', userStatusError);
        return NextResponse.json({ error: 'Failed to revoke user access' }, { status: 500 });
      }

      await adminClient.from('audit_logs').insert({
        table_name: 'internships',
        record_id: id,
        operation: 'UPDATE',
        action: 'end_internship',
        old_values: { status: internship.status },
        new_values: { status: 'completed', user_status: 'terminated' },
        metadata: {
          internshipId: id,
          employeeId: internship.employee_id,
          userId: (employeeForEnd as { id: string; user_id: string }).user_id,
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

    const hiredDate = todayInPhDate();
    const probationEndDate = addDaysToDateOnly(hiredDate, 90);

    const [{ error: convertError }, { error: userRoleError }, { error: employmentTypeError }, { error: authUpdateError }] =
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
          .update({
            employment_type: 'probationary',
            date_hired: hiredDate,
            probation_end_date: probationEndDate,
            manual_probation_status: null,
            updated_at: nowIso(),
          })
          .eq('id', typedEmployee.id)
          .is('deleted_at', null),
        adminClient.auth.admin.updateUserById(typedEmployee.user_id, {
          app_metadata: {
            ...(access as { user?: { app_metadata?: Record<string, unknown> } }).user?.app_metadata,
            db_role: 'employee',
          },
          user_metadata: {
            ...(access as { user?: { user_metadata?: Record<string, unknown> } }).user?.user_metadata,
            role: 'employee',
          },
        }),
      ]);

    if (convertError || userRoleError || employmentTypeError || authUpdateError) {
      console.error('Failed to convert associate to employee:', {
        convertError,
        userRoleError,
        employmentTypeError,
        authUpdateError,
      });
      return NextResponse.json({ error: 'Failed to hire associate as employee' }, { status: 500 });
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
      converted_from: 'associate',
      internship_id: id,
      employment_type: 'probationary',
      hired_date: hiredDate,
      probation_end_date: probationEndDate,
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
        user_role: 'associate',
        employment_type: typedEmployee.employment_type,
      },
      new_values: {
        internship_status: 'converted',
        user_role: 'employee',
        employment_type: 'probationary',
        hired_date: hiredDate,
        probation_end_date: probationEndDate,
      },
      metadata: {
        internshipId: id,
        employeeId: typedEmployee.id,
        userId: typedEmployee.user_id,
        hiredDate,
        probationEndDate,
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
        hiredDate,
        probationEndDate,
      },
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/internships/[id]/actions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
