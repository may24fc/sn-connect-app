import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, hasAtsAccess } from '../_lib';

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
    const search = searchParams.get('search') || undefined;
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '50');

    let query = supabase
      .from('job_postings')
      .select('*', { count: 'exact' })
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error: listError, count } = await query.range(from, to);

    if (listError) {
      console.error('Error fetching archived job postings:', listError);
      return NextResponse.json({ error: 'Failed to fetch archived job postings' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/jobs/archived:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
