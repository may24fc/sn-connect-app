import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin } from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10) || 1;
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10) || 50;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error: fetchError, count } = await supabase
      .from('resources')
      .select('id, title, author_id, approval_status, created_at, pending_changes', { count: 'exact' })
      .in('approval_status', ['pending_approval', 'pending_update', 'pending_deletion'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (fetchError) {
      console.error('Error fetching pending resources:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch pending resources' }, { status: 500 });
    }

    const grouped = { pending_approval: [], pending_update: [], pending_deletion: [] } as Record<string, any[]>;
    (data || []).forEach((r: any) => {
      const key = r.approval_status || 'pending_approval';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    return NextResponse.json({ data: grouped, pagination: { page, pageSize, total: count || 0 } });
  } catch (error) {
    console.error('Unexpected error in GET /api/resources/pending:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
