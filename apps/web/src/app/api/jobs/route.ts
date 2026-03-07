import { type NextRequest, NextResponse } from 'next/server';
import { jobPostingFiltersSchema, createJobPostingSchema } from '@/lib/schemas/job.schema';
import { getAuthedSupabase, isJobAdmin } from './_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isJobAdmin(role)) {
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
      .select('*', { count: 'exact' })
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

    return NextResponse.json({
      data,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/jobs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isJobAdmin(role)) {
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

    const { data, error: createError } = await supabase
      .from('job_postings')
      .insert({
        title: payload.title,
        business_unit_id: payload.business_unit_id || null,
        department: payload.department || null,
        location: payload.location || null,
        employment_type: payload.employment_type,
        description: payload.description,
        requirements: payload.requirements || null,
        benefits: payload.benefits || null,
        salary_range: payload.salary_range || null,
        is_active: payload.is_active,
        closes_at: payload.closes_at || null,
        published_at: payload.is_active ? new Date().toISOString() : null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (createError || !data) {
      console.error('Error creating job posting:', createError);
      return NextResponse.json({ error: 'Failed to create job posting' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/jobs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
