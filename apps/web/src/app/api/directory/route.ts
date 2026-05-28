import {
  collapseEmployeeEquivalentRole,
  expandEmployeeEquivalentRoles,
} from '@/lib/roles';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin'];

interface DirectoryRow {
  full_name: string | null;
  email: string | null;
  position: string | null;
  role: string | null;
  department_name: string | null;
  division_name: string | null;
  status: string | null;
  employment_type: string | null;
}

interface DirectorySearchResult {
  entry: DirectoryRow;
  score: number;
}

function fuzzyScore(entry: DirectoryRow, rawSearch: string): number {
  const search = rawSearch.trim().toLowerCase();
  if (!search) return 0;

  const haystacks = [entry.full_name, entry.email, entry.position]
    .map((value) => (value || '').toLowerCase())
    .filter(Boolean);

  let bestScore = -1;
  for (const haystack of haystacks) {
    if (haystack === search) bestScore = Math.max(bestScore, 100);
    if (haystack.startsWith(search)) bestScore = Math.max(bestScore, 80);
    if (haystack.includes(search)) bestScore = Math.max(bestScore, 60);

    const terms = search.split(/\s+/).filter(Boolean);
    const matchedTerms = terms.filter((term) => haystack.includes(term)).length;
    if (matchedTerms > 0) {
      bestScore = Math.max(bestScore, 40 + matchedTerms * 10);
    }
  }

  return bestScore;
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

    // Check role - only admin/super_admin can access directory
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
    const search = searchParams.get('search') || '';
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
    const employmentType = searchParams.get('employment_type') || '';
    const excludeTerminated = searchParams.get('exclude_terminated') === 'true';
    const sortBy = searchParams.get('sort_by') || 'full_name';
    const sortOrder = searchParams.get('sort_order') === 'desc' ? false : true;
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(Number.parseInt(searchParams.get('page_size') || '20', 10), 100);

    // Build query on the employee_directory view
    let query = supabase.from('employee_directory').select('*', { count: 'exact' });

    // Role filter — "employee" expands to all non-intern roles so admins/leadership
    // appear in the directory when HR filters by Employee.
    if (roleFilter) {
      const expanded = expandEmployeeEquivalentRoles([roleFilter]);
      query = query.in('role', expanded);
    }
    if (roleFilters.length > 0) {
      query = query.in('role', expandEmployeeEquivalentRoles(roleFilters));
    }

    // Department filter
    if (department) {
      query = query.eq('department_name', department);
    }
    if (departmentFilters.length > 0) {
      query = query.in('department_name', departmentFilters);
    }

    if (division) {
      query = query.eq('division_name', division);
    }
    if (divisionFilters.length > 0) {
      query = query.in('division_name', divisionFilters);
    }

    // Status filter (supports comma-separated values for multi-status filtering)
    // Note: 'probation' is not a valid user_status enum value.
    // Probation is tracked via employment_type='probationary', so we translate accordingly.
    const requestedStatuses = status.split(',').map((s) => s.trim()).filter(Boolean);
    const explicitlyIncludesTerminated = requestedStatuses.includes('terminated');

    if (status) {
      const hasProbation = requestedStatuses.includes('probation');
      const validStatuses = requestedStatuses.filter((s) => s !== 'probation');

      if (hasProbation && validStatuses.length > 0) {
        const orParts = validStatuses.map((s) => `status.eq.${s}`);
        orParts.push('employment_type.eq.probationary');
        query = query.or(orParts.join(','));
      } else if (hasProbation) {
        query = query.eq('employment_type', 'probationary');
      } else if (validStatuses.length === 1) {
        query = query.eq('status', validStatuses[0]);
      } else if (validStatuses.length > 1) {
        query = query.or(validStatuses.map((s) => `status.eq.${s}`).join(','));
      }
    }

    // Employment type filter
    if (employmentType) {
      query = query.eq('employment_type', employmentType);
    }

    // General roster pages should not surface terminated staff unless the caller
    // explicitly requested the terminated status.
    if (excludeTerminated || !explicitlyIncludesTerminated) {
      query = query.neq('status', 'terminated');
    }

    // Sorting
    const validSortColumns = [
      'full_name',
      'department_name',
      'division_name',
      'start_date',
      'status',
      'role',
      'position',
    ];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'full_name';
    query = query.order(sortColumn, { ascending: sortOrder });

    let data;
    let count = 0;
    let error;

    if (search) {
      const result = await query;
      data = (result.data || [])
        .map((entry: DirectoryRow): DirectorySearchResult => ({
          entry,
          score: fuzzyScore(entry, search),
        }))
        .filter((item: DirectorySearchResult) => item.score >= 0)
        .sort((left: DirectorySearchResult, right: DirectorySearchResult) => right.score - left.score)
        .map((item: DirectorySearchResult) => item.entry);
      count = data.length;

      const from = (page - 1) * pageSize;
      const to = from + pageSize;
      data = data.slice(from, to);
      error = result.error;
    } else {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const result = await query.range(from, to);
      data = result.data;
      error = result.error;
      count = result.count || 0;
    }

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch directory' },
        { status: 500 }
      );
    }

    // Get aggregate metadata
    const { data: allData } = await supabase
      .from('employee_directory')
      .select('role, status, internship_status, employment_type, department_name, division_name');

    const availableRoles = Array.from(
      new Set(
        (allData || [])
          .map((entry: { role: string | null }) => entry.role)
          .filter((value: string | null): value is string => Boolean(value))
          // Collapse all non-intern staff roles into "employee" so the filter
          // dropdown shows only "Employee" and "Intern".
          .map((r: string) => collapseEmployeeEquivalentRole(r))
      )
    ).sort();

    const metadata = {
      total: count || 0,
      active: allData?.filter((e: { status: string | null }) => e.status === 'active').length || 0,
      interns: allData?.filter((e: { role: string | null }) => e.role === 'intern').length || 0,
      onLeave: allData?.filter((e: { status: string | null }) => e.status === 'on_leave').length || 0,
      probation: allData?.filter((e: { employment_type: string | null }) => e.employment_type === 'probationary').length || 0,
      terminated: allData?.filter((e: { status: string | null }) => e.status === 'terminated').length || 0,
      availableRoles,
    };

    return NextResponse.json({
      data: data || [],
      metadata,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
