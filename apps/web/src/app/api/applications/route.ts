import { type NextRequest, NextResponse } from 'next/server';
import { applicationFiltersSchema } from '@/lib/schemas/job.schema';
import { getAuthedSupabase, isJobAdmin } from '../jobs/_lib';

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
    const parsed = applicationFiltersSchema.safeParse({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      jobPostingId: searchParams.get('jobPostingId') || undefined,
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
      .from('job_applications')
      .select('*, job_postings(id, title)', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.jobPostingId) query = query.eq('job_posting_id', filters.jobPostingId);

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    const { data, error: listError, count } = await query.range(from, to);

    if (listError) {
      console.error('Error fetching applications:', listError);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
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
    console.error('Unexpected error in GET /api/applications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
