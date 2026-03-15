import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

const ADMIN_ROLES = ['admin', 'super_admin'];

interface DirectoryExportRow {
  full_name: string | null;
  role: string | null;
  department_name: string | null;
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
    const status = searchParams.get('status') || '';

    // Fetch all directory data for export
    let query = supabase
      .from('employee_directory')
      .select(
        'full_name, role, department_name, position, status, employment_type, start_date, email, contact_number'
      )
      .order('full_name', { ascending: true });

    if (roleFilter) query = query.eq('role', roleFilter);
  if (roleFilters.length > 0) query = query.in('role', roleFilters);
    if (department) query = query.eq('department_name', department);
  if (departmentFilters.length > 0) query = query.in('department_name', departmentFilters);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to export directory', details: error.message },
        { status: 500 }
      );
    }

    const rows: DirectoryExportRow[] = data || [];

    if (format === 'csv') {
      const headers = [
        'Full Name',
        'Role',
        'Department',
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
      const worksheet = XLSX.utils.json_to_sheet(
        rows.map((row: DirectoryExportRow) => ({
          'Full Name': row.full_name || '',
          Role: row.role || '',
          Department: row.department_name || '',
          Position: row.position || '',
          Status: row.status || '',
          'Employment Type': row.employment_type || '',
          'Start Date': row.start_date || '',
          Email: row.email || '',
          'Contact Number': row.contact_number || '',
        }))
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Directory');
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

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
