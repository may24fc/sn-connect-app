import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'hr', 'cos', 'ceo']);
const ACCOUNTING_ELIGIBLE_ROLES = new Set(['employee', 'associate']);

type ExpenseAnalyticsRow = {
  transaction_date: string;
  processing_status: string;
  expense_type: string | null;
  total_amount: number;
  total_amount_aud: number | null;
  department_id: string | null;
  employee:
    | {
        department: string | null;
      }
    | Array<{
        department: string | null;
      }>
    | null;
};

type PeriodType = 'week' | 'month';

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function startOfWeekUtc(date: Date): Date {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  return copy;
}

function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addWeeksUtc(date: Date, weeks: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + weeks * 7);
  return copy;
}

function addMonthsUtc(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function periodStartFor(dateIso: string, period: PeriodType): Date {
  const parsed = new Date(`${dateIso}T00:00:00Z`);
  return period === 'week' ? startOfWeekUtc(parsed) : startOfMonthUtc(parsed);
}

function periodLabel(date: Date, period: PeriodType): string {
  if (period === 'month') {
    return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }

  const end = addWeeksUtc(date, 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return `${date.toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })} - ${end.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
}

function parseDateParam(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function getEmployeeDepartment(employee: ExpenseAnalyticsRow['employee']): string {
  if (Array.isArray(employee)) {
    return employee[0]?.department || 'Unassigned';
  }

  return employee?.department || 'Unassigned';
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let role: string | null = null;
    if (typeof user.app_metadata?.db_role === 'string') {
      role = user.app_metadata.db_role;
    }

    if (!role) {
      const { data: roleData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      role = roleData?.role ?? null;
    }

    const hasAdminAccess = Boolean(role && ADMIN_ROLES.has(role));
    let hasAccountingAccess = false;

    if (!hasAdminAccess && role && ACCOUNTING_ELIGIBLE_ROLES.has(role)) {
      const { data: isAccountingMember, error: accountingError } = await supabase.rpc(
        'user_is_accounting_member',
        {
          target_user_id: user.id,
        }
      );

      if (!accountingError) {
        hasAccountingAccess = Boolean(isAccountingMember);
      } else {
        const { data: userData } = await supabase
          .from('users')
          .select('department_id')
          .eq('id', user.id)
          .is('deleted_at', null)
          .maybeSingle();

        if (userData?.department_id) {
          const { data: departmentData } = await supabase
            .from('departments')
            .select('name')
            .eq('id', userData.department_id)
            .is('deleted_at', null)
            .maybeSingle();

          const departmentName = departmentData?.name?.trim().toLowerCase();
          hasAccountingAccess = Boolean(
            departmentName && (departmentName.includes('accounting') || departmentName === 'finance')
          );
        }
      }
    }

    if (!hasAdminAccess && !hasAccountingAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const period = params.get('period') === 'month' ? 'month' : 'week';
    const departmentId = params.get('departmentId');
    const processingStatus = params.get('processingStatus');

    const now = new Date();
    const defaultEndDate = toIsoDate(now);
    const parsedEndDate = parseDateParam(params.get('endDate')) || defaultEndDate;

    const inferredStart =
      period === 'month'
        ? toIsoDate(addMonthsUtc(startOfMonthUtc(new Date(`${parsedEndDate}T00:00:00Z`)), -11))
        : toIsoDate(addWeeksUtc(startOfWeekUtc(new Date(`${parsedEndDate}T00:00:00Z`)), -11));

    const parsedStartDate = parseDateParam(params.get('startDate')) || inferredStart;

    let query = supabase
      .from('expense_entries')
      .select(
        'transaction_date, processing_status, expense_type, total_amount, total_amount_aud, department_id, employee:employees!expense_entries_employee_id_fkey(department)'
      )
      .is('deleted_at', null)
      .gte('transaction_date', parsedStartDate)
      .lte('transaction_date', parsedEndDate)
      .order('transaction_date', { ascending: true });

    if (departmentId && departmentId !== 'all') {
      query = query.eq('department_id', departmentId);
    }

    if (processingStatus && processingStatus !== 'all') {
      query = query.eq('processing_status', processingStatus);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to load analytics data' }, { status: 500 });
    }

    const rows = (data || []) as ExpenseAnalyticsRow[];

    const periodMap = new Map<string, { periodStart: string; label: string; totalSpendAud: number; entryCount: number }>();
    const statusMap = new Map<string, { status: string; count: number; totalSpendAud: number }>();
    const categoryMap = new Map<string, { category: string; totalSpendAud: number; count: number }>();
    const departmentMap = new Map<string, { departmentId: string; departmentName: string; totalSpendAud: number; count: number }>();

    let totalSpendAud = 0;

    for (const row of rows) {
      const amountAud = Number(row.total_amount_aud ?? row.total_amount ?? 0);
      totalSpendAud += amountAud;

      const start = periodStartFor(row.transaction_date, period);
      const startKey = toIsoDate(start);
      const currentPeriod = periodMap.get(startKey) || {
        periodStart: startKey,
        label: periodLabel(start, period),
        totalSpendAud: 0,
        entryCount: 0,
      };
      currentPeriod.totalSpendAud += amountAud;
      currentPeriod.entryCount += 1;
      periodMap.set(startKey, currentPeriod);

      const statusKey = row.processing_status || 'unknown';
      const currentStatus = statusMap.get(statusKey) || {
        status: statusKey,
        count: 0,
        totalSpendAud: 0,
      };
      currentStatus.count += 1;
      currentStatus.totalSpendAud += amountAud;
      statusMap.set(statusKey, currentStatus);

      const categoryKey = row.expense_type || 'other';
      const currentCategory = categoryMap.get(categoryKey) || {
        category: categoryKey,
        totalSpendAud: 0,
        count: 0,
      };
      currentCategory.count += 1;
      currentCategory.totalSpendAud += amountAud;
      categoryMap.set(categoryKey, currentCategory);

      const deptId = row.department_id || 'unassigned';
      const deptName = getEmployeeDepartment(row.employee);
      const currentDept = departmentMap.get(deptId) || {
        departmentId: deptId,
        departmentName: deptName,
        totalSpendAud: 0,
        count: 0,
      };
      currentDept.count += 1;
      currentDept.totalSpendAud += amountAud;
      departmentMap.set(deptId, currentDept);
    }

    const trend = Array.from(periodMap.values())
      .sort((a, b) => (a.periodStart < b.periodStart ? -1 : 1))
      .map((item) => ({
        periodStart: item.periodStart,
        label: item.label,
        totalSpendAud: Number(item.totalSpendAud.toFixed(2)),
        entryCount: item.entryCount,
      }));

    const statusBreakdown = Array.from(statusMap.values())
      .map((item) => ({
        status: item.status,
        count: item.count,
        totalSpendAud: Number(item.totalSpendAud.toFixed(2)),
      }))
      .sort((a, b) => b.totalSpendAud - a.totalSpendAud);

    const categoryBreakdown = Array.from(categoryMap.values())
      .map((item) => ({
        category: item.category,
        count: item.count,
        totalSpendAud: Number(item.totalSpendAud.toFixed(2)),
      }))
      .sort((a, b) => b.totalSpendAud - a.totalSpendAud)
      .slice(0, 8);

    const departmentBreakdown = Array.from(departmentMap.values())
      .map((item) => ({
        departmentId: item.departmentId,
        departmentName: item.departmentName,
        count: item.count,
        totalSpendAud: Number(item.totalSpendAud.toFixed(2)),
      }))
      .sort((a, b) => b.totalSpendAud - a.totalSpendAud);

    return NextResponse.json({
      data: {
        period,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        totalEntries: rows.length,
        totalSpendAud: Number(totalSpendAud.toFixed(2)),
        averageSpendAudPerEntry: rows.length > 0 ? Number((totalSpendAud / rows.length).toFixed(2)) : 0,
        trend,
        statusBreakdown,
        categoryBreakdown,
        departmentBreakdown,
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard/analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
