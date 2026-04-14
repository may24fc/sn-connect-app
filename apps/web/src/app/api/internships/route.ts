import { createInternshipSchema, internshipFiltersSchema } from '@/lib/schemas/internship.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedInternshipContext, isInternshipAdmin, resolveEmployeeByUserId } from './_lib';

interface InternshipListRow {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  required_hours: number;
  completed_hours: number;
  status: 'active' | 'completed' | 'terminated' | 'converted';
  supervisor_id: string | null;
  department: string;
  school: string | null;
  program: string | null;
  created_at: string;
  updated_at: string;
}

interface InternDailyLogRow {
  internship_id: string;
  log_date: string;
  is_approved: boolean;
  hours_worked: number;
}

interface EmployeeRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  company_email: string | null;
  department: string;
  users: {
    avatar_url: string | null;
  } | null;
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedInternshipContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = internshipFiltersSchema.safeParse({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      school: searchParams.get('school') || undefined,
      supervisorId: searchParams.get('supervisorId') || undefined,
      employeeId: searchParams.get('employeeId') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const filters = parsed.data;
    const isAdmin = isInternshipAdmin(role);

    let employeeIdFilter: string | undefined = filters.employeeId;
    if (!isAdmin) {
      const { data: employee } = await resolveEmployeeByUserId(supabase, user.id);
      if (!employee?.id) {
        return NextResponse.json({ data: [], summary: null, pagination: null });
      }
      employeeIdFilter = employee.id;
    }

    let query = supabase
      .from('internships')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.school) {
      query = query.ilike('school', `%${filters.school}%`);
    }
    if (filters.supervisorId) {
      query = query.eq('supervisor_id', filters.supervisorId);
    }
    if (employeeIdFilter) {
      query = query.eq('employee_id', employeeIdFilter);
    }

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    const { data, error: listError, count } = await query.range(from, to);

    if (listError) {
      console.error('Error fetching internships:', listError);
      return NextResponse.json({ error: 'Failed to fetch internships' }, { status: 500 });
    }

    const internships = (data || []) as Array<InternshipListRow>;

    if (internships.length === 0) {
      return NextResponse.json({
        data: [],
        summary: {
          totalInterns: 0,
          activeInterns: 0,
          completedInterns: 0,
          averageProgress: 0,
          totalHoursLogged: 0,
          pendingReports: 0,
          reportsThisWeek: 0,
        },
        pagination: {
          page: filters.page,
          pageSize: filters.pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / filters.pageSize),
        },
      });
    }

    const employeeIds = Array.from(new Set(internships.map((item) => item.employee_id)));
    const supervisorIds = Array.from(
      new Set(
        internships.map((item) => item.supervisor_id).filter((value): value is string => !!value)
      )
    );
    const internshipIds = internships.map((item) => item.id);

    const [{ data: employeeRows }, { data: supervisorRows }, { data: logRows }] = await Promise.all(
      [
        supabase
          .from('employees')
          .select(
            'id, user_id, first_name, last_name, company_email, department, users!employees_user_id_fkey(avatar_url)'
          )
          .in('id', employeeIds)
          .is('deleted_at', null),
        supervisorIds.length > 0
          ? supabase
              .from('employees')
              .select('user_id, first_name, last_name')
              .in('user_id', supervisorIds)
              .is('deleted_at', null)
          : Promise.resolve({ data: [] }),
        supabase
          .from('intern_daily_logs')
          .select('internship_id, log_date, is_approved, hours_worked')
          .in('internship_id', internshipIds)
          .order('log_date', { ascending: false }),
      ]
    );

    const employeeMap = new Map(
      (employeeRows as Array<EmployeeRow> | null)?.map((item) => [item.id, item])
    );
    const supervisorMap = new Map(
      (
        supervisorRows as Array<{ user_id: string; first_name: string; last_name: string }> | null
      )?.map((item) => [item.user_id, `${item.first_name} ${item.last_name}`])
    );

    const logsByInternship = new Map<string, Array<InternDailyLogRow>>();
    for (const log of (logRows as Array<InternDailyLogRow> | null) || []) {
      const list = logsByInternship.get(log.internship_id) || [];
      list.push(log);
      logsByInternship.set(log.internship_id, list);
    }

    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const normalized = internships
      .map((row) => {
        const employee = employeeMap.get(row.employee_id);
        if (!employee) return null;

        const logs = logsByInternship.get(row.id) || [];
        const pendingReports = logs.filter((log) => !log.is_approved).length;
        const lastReportDate = logs.at(0)?.log_date || null;
        const reportsThisWeek = logs.filter((log) => new Date(log.log_date) >= startOfWeek).length;

        const requiredHours = Number(row.required_hours || 0);
        const completedHours = Number(row.completed_hours || 0);
        const progressPercentage =
          requiredHours > 0 ? Math.min(Math.round((completedHours / requiredHours) * 100), 100) : 0;

        const fullName = `${employee.first_name} ${employee.last_name}`.trim();

        return {
          id: row.id,
          internshipId: row.id,
          employeeId: row.employee_id,
          userId: employee.user_id,
          name: fullName,
          email: employee.company_email || '',
          avatarUrl: employee.users?.avatar_url ?? undefined,
          school: row.school || 'N/A',
          program: row.program || 'N/A',
          department: row.department || employee.department,
          supervisor: row.supervisor_id
            ? supervisorMap.get(row.supervisor_id) || 'Unassigned'
            : 'Unassigned',
          supervisorId: row.supervisor_id,
          startDate: row.start_date,
          endDate: row.end_date,
          requiredHours,
          completedHours,
          progressPercentage,
          status: row.status,
          pendingReports,
          lastReportDate,
          reportsThisWeek,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => {
        if (!filters.search) return true;
        const queryValue = filters.search.toLowerCase();
        return (
          item.name.toLowerCase().includes(queryValue) ||
          item.email.toLowerCase().includes(queryValue) ||
          item.program.toLowerCase().includes(queryValue)
        );
      });

    const totalInterns = normalized.length;
    const activeInterns = normalized.filter((item) => item.status === 'active').length;
    const completedInterns = normalized.filter((item) => item.status === 'completed').length;
    const totalHoursLogged = normalized.reduce((sum, item) => sum + item.completedHours, 0);
    const pendingReports = normalized.reduce((sum, item) => sum + item.pendingReports, 0);
    const reportsThisWeek = normalized.reduce((sum, item) => sum + item.reportsThisWeek, 0);
    const averageProgress =
      totalInterns > 0
        ? Math.round(
            normalized.reduce((sum, item) => sum + item.progressPercentage, 0) / totalInterns
          )
        : 0;

    return NextResponse.json({
      data: normalized,
      summary: {
        totalInterns,
        activeInterns,
        completedInterns,
        averageProgress,
        totalHoursLogged,
        pendingReports,
        reportsThisWeek,
      },
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/internships:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedInternshipContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isInternshipAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createInternshipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const { data, error: insertError } = await supabase
      .from('internships')
      .insert({
        employee_id: payload.employeeId,
        start_date: payload.startDate,
        end_date: payload.endDate,
        required_hours: payload.requiredHours,
        completed_hours: payload.completedHours,
        status: payload.status,
        supervisor_id: payload.supervisorId || null,
        department: payload.department,
        school: payload.school || null,
        program: payload.program || null,
      })
      .select('*')
      .single();

    if (insertError || !data) {
      console.error('Error creating internship:', insertError);
      return NextResponse.json({ error: 'Failed to create internship' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/internships:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
