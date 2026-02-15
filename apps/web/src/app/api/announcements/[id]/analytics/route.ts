import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isAnnouncementAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAnnouncementAdmin(role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select('id, title, status, read_count, published_at')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (announcementError || !announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const {
      data: reads,
      error: readsError,
      count: readCountExact,
    } = await supabase
      .from('announcement_reads')
      .select('id, user_id, read_at', { count: 'exact' })
      .eq('announcement_id', id)
      .order('read_at', { ascending: true });

    if (readsError) {
      return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
    }

    const dailyMap = new Map<string, number>();
    for (const read of (reads || []) as Array<{ read_at: string }>) {
      const key = read.read_at.slice(0, 10);
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    }

    const timeSeries = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      data: {
        announcement,
        readCount: readCountExact || 0,
        uniqueReaders: new Set(
          ((reads || []) as Array<{ user_id: string }>).map((read) => read.user_id)
        ).size,
        timeSeries,
        reads: reads || [],
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/announcements/[id]/analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
