import { type NextRequest, NextResponse } from 'next/server';
import { jobPostingFiltersSchema, createJobPostingSchema } from '@/lib/schemas/job.schema';
import { getAuthedSupabase, hasAtsAccess } from './_lib';

function normalizeJobPosting<T extends Record<string, unknown>>(row: T) {
  const requisitions = Array.isArray(row.job_requisitions) ? row.job_requisitions : [];
  const jobRequisition = requisitions.find(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && item.deleted_at == null
  ) ?? null;

  return {
    ...row,
    job_requisition: jobRequisition,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, hasAtsGrant, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAtsAccess(role, hasAtsGrant)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = jobPostingFiltersSchema.safeParse({
      search: searchParams.get('search') || undefined,
      employmentType: searchParams.get('employmentType') || undefined,
      isActive: searchParams.get('isActive') || undefined,
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

    let query = supabase
      .from('job_postings')
      .select('*, job_requisitions(*)', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    if (filters.employmentType) query = query.eq('employment_type', filters.employmentType);
    if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    const { data, error: listError, count } = await query.range(from, to);

    if (listError) {
      console.error('Error fetching job postings:', listError);
      return NextResponse.json({ error: 'Failed to fetch job postings' }, { status: 500 });
    }

    /**
     * Whole-dataset counts for the dashboard cards. The active/archived split
     * ignores the caller's `isActive` filter so the breakdown stays stable
     * while the filter changes.
     */
    const countMatching = async (isActive?: boolean): Promise<number> => {
      let countQuery = supabase
        .from('job_postings')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      if (filters.search) {
        countQuery = countQuery.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }
      if (filters.employmentType) {
        countQuery = countQuery.eq('employment_type', filters.employmentType);
      }
      if (isActive !== undefined) countQuery = countQuery.eq('is_active', isActive);

      const { count: matched } = await countQuery;
      return matched ?? 0;
    };

    const [statsTotal, activeCount, archivedCount] = await Promise.all([
      countMatching(),
      countMatching(true),
      countMatching(false),
    ]);

    return NextResponse.json({
      data: (data ?? []).map((row: Record<string, unknown>) => normalizeJobPosting(row)),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.pageSize),
      },
      stats: { total: statsTotal, active: activeCount, archived: archivedCount },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/jobs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, role, hasAtsGrant, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAtsAccess(role, hasAtsGrant)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createJobPostingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const { data, error: createError } = await supabase.rpc('create_job_posting_with_requisition', {
      p_title: payload.title,
      p_business_unit_id: payload.business_unit_id || null,
      p_department: payload.department || null,
      p_location: payload.location || null,
      p_total_headcount: payload.total_headcount,
      p_employment_type: payload.employment_type,
      p_description: payload.description,
      p_requirements: payload.requirements || null,
      p_benefits: payload.benefits || null,
      p_salary_range: payload.salary_range || null,
      p_is_active: payload.is_active,
      p_closes_at: payload.closes_at || null,
    });

    if (createError || !data) {
      console.error('Error creating job posting with requisition:', createError);
      const message = createError?.message ?? 'Failed to create job posting';
      const normalizedMessage = message.toLowerCase();
      const statusCode = normalizedMessage.includes('unauthorized')
        ? 401
        : normalizedMessage.includes('must be at least 1') ||
            normalizedMessage.includes('invalid input')
          ? 400
          : 500;
      return NextResponse.json({ error: message }, { status: statusCode });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/jobs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
