import { expandEmployeeEquivalentRoles } from '@/lib/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import ExcelJS from 'exceljs';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin'];

interface DirectoryExportRow {
  full_name: string | null;
  role: string | null;
  department_name: string | null;
  division_name: string | null;
  position: string | null;
  status: string | null;
  employment_type: string | null;
  start_date: string | null;
  email: string | null;
  contact_number: string | null;
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

    // Check role
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

    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const roleFilter = searchParams.get('role') || '';
    const roleFilters = (searchParams.get('roles') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const department = searchParams.get('department') || '';
    const departmentFilters = (searchParams.get('departments') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const division = searchParams.get('division') || '';
    const divisionFilters = (searchParams.get('divisions') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const status = searchParams.get('status') || '';

    // Fetch all directory data for export (exclude terminated unless explicitly filtered)
    let query = supabase
      .from('employee_directory')
      .select(
        'full_name, role, department_name, division_name, position, status, employment_type, start_date, email, contact_number'
      )
      .order('full_name', { ascending: true });

    if (!status) query = query.neq('status', 'terminated');

    if (roleFilter) query = query.in('role', expandEmployeeEquivalentRoles([roleFilter]));
    if (roleFilters.length > 0) {
      query = query.in('role', expandEmployeeEquivalentRoles(roleFilters));
    }
    if (department) query = query.eq('department_name', department);
    if (departmentFilters.length > 0) query = query.in('department_name', departmentFilters);
    if (division) query = query.eq('division_name', division);
    if (divisionFilters.length > 0) query = query.in('division_name', divisionFilters);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to export directory' },
        { status: 500 }
      );
    }

    const rows: DirectoryExportRow[] = data || [];

    if (format === 'csv') {
      const headers = [
        'Full Name',
        'Role',
        'Department',
        'Division',
        'Position',
        'Status',
        'Employment Type',
        'Start Date',
        'Email',
        'Contact Number',
      ];

      const csvRows = rows.map((row) =>
        [
          escapeCsv(row.full_name),
          escapeCsv(row.role),
          escapeCsv(row.department_name),
          escapeCsv(row.division_name),
          escapeCsv(row.position),
          escapeCsv(row.status),
          escapeCsv(row.employment_type),
          escapeCsv(row.start_date),
          escapeCsv(row.email),
          escapeCsv(row.contact_number),
        ].join(',')
      );

      const csv = [headers.join(','), ...csvRows].join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="employee-directory-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Directory');

      worksheet.columns = [
        { header: 'Full Name', key: 'full_name', width: 25 },
        { header: 'Role', key: 'role', width: 15 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Division', key: 'division', width: 24 },
        { header: 'Position', key: 'position', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Employment Type', key: 'employment_type', width: 18 },
        { header: 'Start Date', key: 'start_date', width: 15 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Contact Number', key: 'contact_number', width: 18 },
      ];

      for (const row of rows) {
        worksheet.addRow({
          full_name: row.full_name || '',
          role: row.role || '',
          department: row.department_name || '',
          division: row.division_name || '',
          position: row.position || '',
          status: row.status || '',
          employment_type: row.employment_type || '',
          start_date: row.start_date || '',
          email: row.email || '',
          contact_number: row.contact_number || '',
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="employee-directory-${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      });
    }

    // JSON format fallback
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function escapeCsv(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
