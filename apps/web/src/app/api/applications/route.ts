import { type NextRequest, NextResponse } from 'next/server';
import { applicationFiltersSchema } from '@/lib/schemas/job.schema';
import { getAuthedSupabase, hasAtsAccess, resolveReviewerIdentities } from '../jobs/_lib';

function normalizeApplication<T extends Record<string, unknown>>(row: T) {
  const jobPosting =
    typeof row.job_postings === 'object' && row.job_postings !== null
      ? (row.job_postings as Record<string, unknown>)
      : null;
  const requisitions = Array.isArray(jobPosting?.job_requisitions)
    ? jobPosting.job_requisitions
    : [];
  const jobRequisition = requisitions.find(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && item.deleted_at == null
  ) ?? null;

  return {
    ...row,
    job_postings: jobPosting
      ? {
          ...jobPosting,
          job_requisition: jobRequisition,
        }
      : null,
  };
}

type ApplicationRow = Record<string, unknown> & {
  reviewed_by?: unknown;
};

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
    const parsed = applicationFiltersSchema.safeParse({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      jobPostingId: searchParams.get('jobPostingId') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      minScore: searchParams.get('minScore') || undefined,
      maxScore: searchParams.get('maxScore') || undefined,
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
      .select('*, job_postings(id, title, is_active, closes_at, job_requisitions(*))', {
        count: 'exact',
      })
      .is('deleted_at', null);

    // Apply sorting
    if (filters.sortBy === 'ai_match_score') {
      query = query.order('ai_match_score', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.jobPostingId) query = query.eq('job_posting_id', filters.jobPostingId);
    if (filters.minScore != null) query = query.gte('ai_match_score', filters.minScore);
    if (filters.maxScore != null) query = query.lte('ai_match_score', filters.maxScore);

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    const { data, error: listError, count } = await query.range(from, to);

    if (listError) {
      console.error('Error fetching applications:', listError);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    const reviewerIdentities = await resolveReviewerIdentities(
      (data ?? [])
        .map((row: ApplicationRow) => (typeof row.reviewed_by === 'string' ? row.reviewed_by : null))
        .filter((value: string | null): value is string => Boolean(value)),
    );

    return NextResponse.json({
      data: (data ?? []).map((row: ApplicationRow) => {
        const normalizedRow = normalizeApplication(row);
        const reviewedBy = typeof normalizedRow.reviewed_by === 'string' ? normalizedRow.reviewed_by : null;

        return {
          ...normalizedRow,
          reviewer_display_name: reviewedBy ? (reviewerIdentities.get(reviewedBy)?.displayName ?? null) : null,
        };
      }),
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
