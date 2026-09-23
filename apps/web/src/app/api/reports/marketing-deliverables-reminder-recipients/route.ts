import { logActivity } from '@/lib/audit';
import { getNormalizedMetadataRole } from '@/lib/auth/role';
import { marketingDeliverablesReminderRecipientSchema } from '@/lib/schemas/report.schema';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

interface MarketingReminderRecipient {
  employeeId: string;
  fullName: string;
  position: string | null;
  included: boolean;
}

async function requireSuperAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse<{ error: string }> }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  let role = getNormalizedMetadataRole(user.app_metadata);
  if (!role) {
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (userError) {
      console.error('Failed to resolve Marketing reminder administrator role:', userError);
      return {
        ok: false,
        response: NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 }),
      };
    }

    role = getNormalizedMetadataRole({ db_role: userRow?.role });
  }

  if (role !== 'super_admin') {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true, userId: user.id };
}

function formatFullName(employee: {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
}): string {
  return [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(' ');
}

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) {
      return auth.response;
    }

    const admin = createSupabaseAdminClient();
    const { data: employees, error: employeesError } = await admin
      .from('employees')
      .select('id, first_name, middle_name, last_name, position, user_id')
      .ilike('department', 'marketing')
      .is('deleted_at', null)
      .order('last_name', { ascending: true });

    if (employeesError) {
      console.error('Failed to load Marketing reminder employees:', employeesError);
      return NextResponse.json({ error: 'Failed to load Marketing employees' }, { status: 500 });
    }

    const employeeIds = (employees ?? []).map((employee) => employee.id);
    const userIds = (employees ?? []).map((employee) => employee.user_id).filter(Boolean);
    const { data: users, error: usersError } = userIds.length
      ? await admin
          .from('users')
          .select('id, role, status')
          .in('id', userIds)
          .is('deleted_at', null)
      : { data: [], error: null };

    if (usersError) {
      console.error('Failed to load Marketing reminder user accounts:', usersError);
      return NextResponse.json({ error: 'Failed to load Marketing employees' }, { status: 500 });
    }

    const { data: recipientRows, error: recipientsError } = employeeIds.length
      ? await admin
          .from('marketing_deliverables_reminder_recipients')
          .select('employee_id, included')
          .in('employee_id', employeeIds)
      : { data: [], error: null };

    if (recipientsError) {
      console.error('Failed to load Marketing reminder recipients:', recipientsError);
      return NextResponse.json({ error: 'Failed to load reminder recipients' }, { status: 500 });
    }

    const eligibleUserIds = new Set(
      (users ?? [])
        .filter(
          (user) =>
            ['employee', 'associate'].includes(user.role) &&
            !['terminated', 'inactive'].includes(user.status)
        )
        .map((user) => user.id)
    );
    const includedByEmployeeId = new Map(
      (recipientRows ?? []).map((recipient) => [recipient.employee_id, recipient.included])
    );
    const recipients: Array<MarketingReminderRecipient> = (employees ?? [])
      .filter((employee) => employee.user_id && eligibleUserIds.has(employee.user_id))
      .map((employee) => ({
        employeeId: employee.id,
        fullName: formatFullName(employee) || 'Unnamed employee',
        position: employee.position,
        included: includedByEmployeeId.get(employee.id) ?? false,
      }));

    return NextResponse.json({ data: recipients });
  } catch (error) {
    console.error(
      'Unexpected error in GET /api/reports/marketing-deliverables-reminder-recipients:',
      error
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) {
      return auth.response;
    }

    const parsed = marketingDeliverablesReminderRecipientSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: employee, error: employeeError } = await admin
      .from('employees')
      .select('id, user_id, department')
      .eq('id', parsed.data.employeeId)
      .is('deleted_at', null)
      .maybeSingle();

    if (employeeError) {
      console.error('Failed to validate Marketing reminder employee:', employeeError);
      return NextResponse.json({ error: 'Failed to validate employee' }, { status: 500 });
    }

    if (
      !employee ||
      employee.department.trim().toLowerCase() !== 'marketing' ||
      !employee.user_id
    ) {
      return NextResponse.json(
        { error: 'Employee is not eligible for this reminder' },
        { status: 400 }
      );
    }

    const { data: userRow, error: userError } = await admin
      .from('users')
      .select('role, status')
      .eq('id', employee.user_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (userError) {
      console.error('Failed to validate Marketing reminder user:', userError);
      return NextResponse.json({ error: 'Failed to validate employee' }, { status: 500 });
    }

    if (
      !userRow ||
      !['employee', 'associate'].includes(userRow.role) ||
      ['terminated', 'inactive'].includes(userRow.status)
    ) {
      return NextResponse.json(
        { error: 'Employee is not eligible for this reminder' },
        { status: 400 }
      );
    }

    const { error: upsertError } = await admin
      .from('marketing_deliverables_reminder_recipients')
      .upsert(
        {
          employee_id: employee.id,
          included: parsed.data.included,
          updated_by: auth.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id' }
      );

    if (upsertError) {
      console.error('Failed to update Marketing reminder recipient:', upsertError);
      return NextResponse.json({ error: 'Failed to update reminder recipient' }, { status: 500 });
    }

    logActivity(admin, {
      userId: auth.userId,
      action: 'update_marketing_deliverables_reminder_recipient',
      tableName: 'marketing_deliverables_reminder_recipients',
      recordId: employee.id,
      metadata: { employeeId: employee.id, included: parsed.data.included },
    });

    return NextResponse.json({ data: { employeeId: employee.id, included: parsed.data.included } });
  } catch (error) {
    console.error(
      'Unexpected error in PATCH /api/reports/marketing-deliverables-reminder-recipients:',
      error
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
