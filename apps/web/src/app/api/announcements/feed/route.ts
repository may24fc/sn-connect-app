import { announcementFiltersSchema } from '@/lib/schemas/announcement.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = announcementFiltersSchema.safeParse({
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      readStatus: searchParams.get('readStatus') || undefined,
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
      .from('announcements')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .eq('status', 'published')
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false });

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    const { data, error: feedError, count } = await query.range(from, to);

    if (feedError) {
      return NextResponse.json({ error: 'Failed to fetch announcements feed' }, { status: 500 });
    }

    const typedAnnouncements = (data || []) as Array<{ id: string; [key: string]: unknown }>;

    const announcementIds = typedAnnouncements.map((item) => item.id);

    let readIds = new Set<string>();
    if (announcementIds.length > 0) {
      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id)
        .in('announcement_id', announcementIds);

      readIds = new Set(
        ((reads || []) as Array<{ announcement_id: string }>).map((item) => item.announcement_id)
      );
    }

    let enrichedData = typedAnnouncements.map((item) => ({
      ...item,
      is_read: readIds.has(item.id),
    }));

    if (filters.readStatus === 'read') {
      enrichedData = enrichedData.filter((item) => item.is_read);
    }

    if (filters.readStatus === 'unread') {
      enrichedData = enrichedData.filter((item) => !item.is_read);
    }

    return NextResponse.json({
      data: enrichedData,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/announcements/feed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
