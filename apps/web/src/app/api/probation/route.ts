import { logActivity } from '@/lib/audit';
import {
  createNotification,
  getUserDisplayName,
} from '@/lib/notifications/create-notification';
import { probationActionSchema } from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedPerformanceContext, isPerformanceAdmin } from '../performance/_lib';

function isMissingColumnError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = 'message' in error ? error.message : null;

  return typeof message === 'string' && message.includes(columnName);
}

function daysBetweenToday(dateValue: string): number {
  const target = new Date(dateValue);
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function parseIsoDateOnly(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split('-').map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getStage(dateHired: string, probationEndDate: string): 1 | 2 | 3 | 4 {
  const start = new Date(dateHired);
  const end = new Date(probationEndDate);
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const elapsed = Math.max(0, Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const ratio = elapsed / totalDays;

  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

export async function GET() {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPerformanceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employeeSelectBase =
      'id, user_id, first_name, last_name, company_email, department, position, date_hired, probation_end_date, immediate_head, users!employees_user_id_fkey(avatar_url, status)';

    let employees: Array<any> | null = null;
    let employeesError: any = null;

    const primaryEmployeesQuery = await supabaseAdmin
      .from('employees')
      .select(`${employeeSelectBase}, manual_probation_status`)
      .is('deleted_at', null)
      .order('probation_end_date', { ascending: true, nullsFirst: false });

    if (
      primaryEmployeesQuery.error &&
      isMissingColumnError(primaryEmployeesQuery.error, 'manual_probation_status')
    ) {
      const fallbackEmployeesQuery = await supabaseAdmin
        .from('employees')
        .select(employeeSelectBase)
        .is('deleted_at', null)
        .order('probation_end_date', { ascending: true, nullsFirst: false });

      employees = fallbackEmployeesQuery.data;
      employeesError = fallbackEmployeesQuery.error;
    } else {
      employees = primaryEmployeesQuery.data;
      employeesError = primaryEmployeesQuery.error;
    }

    if (employeesError) {
      console.error('Failed to fetch probation employee records:', employeesError);
      return NextResponse.json({ error: 'Failed to fetch probation records' }, { status: 500 });
    }

    const activeEmployees = (employees || []).filter(
      (employee: any) => employee.probation_end_date && employee.users?.status !== 'terminated'
    );

    if (activeEmployees.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const employeeIds = activeEmployees.map((employee: any) => employee.id);
    const userIds = activeEmployees.map((employee: any) => employee.user_id).filter(Boolean);
    const managerIds = Array.from(
      new Set(activeEmployees.map((employee: any) => employee.immediate_head).filter(Boolean))
    );

    const [{ data: okrs }, { data: kpis }, { data: documents }, { data: activeCycle }, { data: roleMetadataRows }] =
      await Promise.all([
        supabaseAdmin
          .from('okrs')
          .select('*')
          .in('employee_id', employeeIds)
          .order('updated_at', { ascending: false }),
        supabaseAdmin
          .from('kpis')
          .select('*')
          .in('employee_id', employeeIds)
          .order('updated_at', { ascending: false }),
        supabaseAdmin.from('documents').select('id, employee_id').in('employee_id', employeeIds),
        supabaseAdmin
          .from('review_cycles')
          .select('id')
          .eq('status', 'active')
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        userIds.length > 0
          ? supabaseAdmin
              .from('user_role_metadata')
              .select('user_id, role_type, metadata')
              .in('user_id', userIds)
              .eq('role_type', 'other')
          : Promise.resolve({ data: [] }),
      ]);

    const { data: managerEmployees } =
      managerIds.length > 0
        ? await supabaseAdmin
            .from('employees')
            .select('user_id, first_name, last_name')
            .in('user_id', managerIds)
            .is('deleted_at', null)
        : { data: [] };

    const managerMap = new Map(
      (managerEmployees || []).map((manager: any) => [
        manager.user_id,
        `${manager.first_name} ${manager.last_name}`,
      ])
    );

    const okrsByEmployee = new Map<string, Array<any>>();
    for (const okr of okrs || []) {
      const list = okrsByEmployee.get(okr.employee_id) || [];
      list.push(okr);
      okrsByEmployee.set(okr.employee_id, list);
    }

    const kpisByEmployee = new Map<string, Array<any>>();
    for (const kpi of kpis || []) {
      const list = kpisByEmployee.get(kpi.employee_id) || [];
      list.push(kpi);
      kpisByEmployee.set(kpi.employee_id, list);
    }

    const docsByEmployee = new Map<string, number>();
    for (const document of documents || []) {
      docsByEmployee.set(document.employee_id, (docsByEmployee.get(document.employee_id) || 0) + 1);
    }

    const currentCycleId = activeCycle?.id ?? null;
    const roleMetadataByUserId = new Map(
      (roleMetadataRows || []).map((row: any) => [row.user_id, row.metadata ?? {}])
    );

    const data = activeEmployees.map((employee: any) => {
      const roleMetadata = roleMetadataByUserId.get(employee.user_id) as Record<string, unknown> | undefined;
      const convertedFromAssociate = roleMetadata?.converted_from === 'associate';
      const metadataHiredDate = parseIsoDateOnly(roleMetadata?.hired_date) || parseIsoDateOnly(roleMetadata?.converted_at);
      const metadataProbationEndDate = parseIsoDateOnly(roleMetadata?.probation_end_date);

      const effectiveDateHired =
        convertedFromAssociate && metadataHiredDate
          ? metadataHiredDate
          : employee.date_hired;

      let effectiveProbationEndDate = employee.probation_end_date;
      if (convertedFromAssociate && metadataProbationEndDate) {
        effectiveProbationEndDate = metadataProbationEndDate;
      }

      if (effectiveDateHired && effectiveProbationEndDate) {
        if (new Date(effectiveProbationEndDate) <= new Date(effectiveDateHired)) {
          effectiveProbationEndDate = addDaysToDateOnly(effectiveDateHired, 90);
        }
      }

      if (!effectiveDateHired || !effectiveProbationEndDate) {
        return null;
      }

      const daysRemaining = daysBetweenToday(effectiveProbationEndDate);
      const baselineEnd = new Date(effectiveDateHired);
      baselineEnd.setDate(baselineEnd.getDate() + 90);
      const isExtended = new Date(effectiveProbationEndDate) > baselineEnd;

      const computedStatus =
        daysRemaining <= 0
          ? 'completed'
          : isExtended
            ? 'extended'
            : daysRemaining <= 14
              ? 'at-risk'
              : 'on-track';

      const status =
        employee.manual_probation_status && computedStatus !== 'completed' && computedStatus !== 'extended'
          ? employee.manual_probation_status
          : computedStatus;

      const employeeOkrs = (okrsByEmployee.get(employee.id) || [])
        .filter((okr) => (currentCycleId ? okr.cycle_id === currentCycleId : true))
        .map((okr) => ({
          id: okr.id,
          objective: okr.objective,
          keyResults: Array.isArray(okr.key_results)
            ? okr.key_results.map((keyResult: any) => ({
                id: keyResult.id || `${okr.id}-${keyResult.description || 'kr'}`,
                description: keyResult.description || 'Key result',
                target: String(keyResult.targetValue ?? 0),
                current: String(keyResult.currentValue ?? 0),
                progress: Number(keyResult.progressPercentage ?? 0),
              }))
            : [],
          status: okr.status || 'in_progress',
        }));

      const employeeKpis = (kpisByEmployee.get(employee.id) || [])
        .filter((kpi) => (currentCycleId ? kpi.cycle_id === currentCycleId : true))
        .map((kpi) => {
          const targetValue = Number(kpi.target_value || 0);
          const currentValue = Number(kpi.current_value || 0);
          const score = targetValue > 0 ? Math.round((currentValue / targetValue) * 100) : 0;
          return {
            id: kpi.id,
            name: kpi.name,
            description: '',
            target: `${targetValue}${kpi.unit || ''}`,
            actual: `${currentValue}${kpi.unit || ''}`,
            score,
          };
        });

      return {
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.company_email,
        avatarUrl: employee.users?.avatar_url ?? null,
        department: employee.department,
        position: employee.position,
        startDate: effectiveDateHired,
        probationEndDate: effectiveProbationEndDate,
        stage: getStage(effectiveDateHired, effectiveProbationEndDate),
        status,
        daysRemaining: Math.max(0, daysRemaining),
        manager: managerMap.get(employee.immediate_head) || 'Unassigned',
        documentsComplete: docsByEmployee.get(employee.id) || 0,
        totalDocuments: 8,
        okrs: employeeOkrs,
        kpis: employeeKpis,
      };
    }).filter((employee): employee is NonNullable<typeof employee> => employee !== null);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/probation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedPerformanceContext();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPerformanceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = probationActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.action === 'extend') {
      const { data, error: updateError } = await supabase
        .from('employees')
        .update({
          probation_end_date: parsed.data.newProbationEndDate,
          manual_probation_status: null,
        })
        .eq('id', parsed.data.employeeId)
        .is('deleted_at', null)
        .select('id, user_id, first_name, last_name, immediate_head, probation_end_date')
        .single();

      if (updateError || !data) {
        return NextResponse.json({ error: 'Failed to extend probation' }, { status: 500 });
      }

      const employeeName = `${data.first_name} ${data.last_name}`.trim();
      const formattedEndDate = new Date(parsed.data.newProbationEndDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const actorName = await getUserDisplayName(user.id);

      const notificationTasks: Array<Promise<void>> = [];

      if (data.user_id) {
        notificationTasks.push(
          createNotification({
            userId: data.user_id,
            type: 'probation_update',
            title: 'Probation Period Extended',
            message: `${actorName} extended your probation period to ${formattedEndDate}.`,
            link: '/dashboard',
            metadata: {
              employeeId: data.id,
              action: 'extend',
              updatedBy: user.id,
              newProbationEndDate: parsed.data.newProbationEndDate,
            },
          })
        );
      }

      if (data.immediate_head && data.immediate_head !== data.user_id) {
        notificationTasks.push(
          createNotification({
            userId: data.immediate_head,
            type: 'probation_update',
            title: `Probation Extended: ${employeeName}`,
            message: `${actorName} extended ${employeeName}'s probation period to ${formattedEndDate}.`,
            link: `/admin/employee-management?employeeId=${data.id}`,
            metadata: {
              employeeId: data.id,
              action: 'extend',
              updatedBy: user.id,
              newProbationEndDate: parsed.data.newProbationEndDate,
            },
          })
        );
      }

      await Promise.all(notificationTasks);

      logActivity(supabase, {
        userId: user.id,
        action: 'extend_probation',
        tableName: 'employees',
        recordId: data.id,
        metadata: {
          employeeId: data.id,
          newProbationEndDate: parsed.data.newProbationEndDate,
          recipients: [data.user_id, data.immediate_head].filter(Boolean),
        },
      });

      return NextResponse.json({ data, message: 'Probation period extended successfully' });
    }

    if (parsed.data.action === 'set-status') {
      const { data, error: updateError } = await supabase
        .from('employees')
        .update({ manual_probation_status: parsed.data.status })
        .eq('id', parsed.data.employeeId)
        .is('deleted_at', null)
        .select('id, manual_probation_status')
        .single();

      if (updateError || !data) {
        return NextResponse.json({ error: 'Failed to update probation status' }, { status: 500 });
      }

      logActivity(supabase, {
        userId: user.id,
        action: 'set_probation_status_override',
        tableName: 'employees',
        recordId: parsed.data.employeeId,
        metadata: {
          employeeId: parsed.data.employeeId,
          status: parsed.data.status,
        },
      });

      return NextResponse.json({ data, message: 'Probation status updated successfully' });
    }

    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, user_id, first_name, last_name, immediate_head')
      .eq('id', parsed.data.employeeId)
      .is('deleted_at', null)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const { data: activeCycle } = await supabase
      .from('review_cycles')
      .select('id')
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeCycle) {
      await supabase.from('performance_reviews').upsert(
        {
          cycle_id: activeCycle.id,
          employee_id: parsed.data.employeeId,
          reviewer_id: user.id,
          status: 'completed',
          final_rating: parsed.data.finalRating ?? null,
          manager_comments: parsed.data.comments ?? null,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'cycle_id,employee_id' }
      );
    }

    const { data, error: updateError } = await supabase
      .from('employees')
      .update({ probation_end_date: null, manual_probation_status: null })
      .eq('id', parsed.data.employeeId)
      .is('deleted_at', null)
      .select('id, probation_end_date')
      .single();

    if (updateError || !data) {
      return NextResponse.json({ error: 'Failed to complete probation' }, { status: 500 });
    }

    const employeeName = `${employee.first_name} ${employee.last_name}`.trim();
    const actorName = await getUserDisplayName(user.id);
    const notificationTasks: Array<Promise<void>> = [];

    if (employee.user_id) {
      notificationTasks.push(
        createNotification({
          userId: employee.user_id,
          type: 'probation_update',
          title: 'Probation Evaluation Completed',
          message:
            typeof parsed.data.finalRating === 'number'
              ? `${actorName} completed your probation evaluation with a final rating of ${parsed.data.finalRating}/5.`
              : `${actorName} completed your probation evaluation.`,
          link: '/dashboard',
          metadata: {
            employeeId: employee.id,
            action: 'complete',
            completedBy: user.id,
            ...(typeof parsed.data.finalRating === 'number'
              ? { finalRating: parsed.data.finalRating }
              : {}),
          },
        })
      );
    }

    if (employee.immediate_head && employee.immediate_head !== employee.user_id) {
      notificationTasks.push(
        createNotification({
          userId: employee.immediate_head,
          type: 'probation_update',
          title: `Probation Completed: ${employeeName}`,
          message: `${actorName} completed ${employeeName}'s probation evaluation.`,
          link: `/admin/employee-management?employeeId=${employee.id}`,
          metadata: {
            employeeId: employee.id,
            action: 'complete',
            completedBy: user.id,
            ...(typeof parsed.data.finalRating === 'number'
              ? { finalRating: parsed.data.finalRating }
              : {}),
          },
        })
      );
    }

    await Promise.all(notificationTasks);

    logActivity(supabase, {
      userId: user.id,
      action: 'complete_probation_evaluation',
      tableName: 'employees',
      recordId: employee.id,
      metadata: {
        employeeId: employee.id,
        ...(typeof parsed.data.finalRating === 'number'
          ? { finalRating: parsed.data.finalRating }
          : {}),
        recipients: [employee.user_id, employee.immediate_head].filter(Boolean),
      },
    });

    return NextResponse.json({ data, message: 'Probation evaluation completed successfully' });
  } catch (error) {
    console.error('POST /api/probation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
