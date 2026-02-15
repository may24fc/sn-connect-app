import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the resource
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('id, view_count, download_count, bookmark_count')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (resourceError || !resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Get view history for time series
    const { data: views, error: viewsError } = await supabase
      .from('resource_views')
      .select('viewed_at, user_id, duration_seconds, completed')
      .eq('resource_id', id)
      .order('viewed_at', { ascending: false })
      .limit(1000);

    if (viewsError) {
      console.error('Error fetching resource views:', viewsError);
    }

    // Calculate time series data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const timeSeries: Array<{ date: string; views: number }> = [];
    const dateMap = new Map<string, number>();

    // Initialize all dates in the range
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr) {
        dateMap.set(dateStr, 0);
      }
    }

    // Count views per day
    for (const view of views || []) {
      const dateStr = new Date(view.viewed_at).toISOString().split('T')[0];
      if (dateStr && dateMap.has(dateStr)) {
        const currentCount = dateMap.get(dateStr);
        if (currentCount !== undefined) {
          dateMap.set(dateStr, currentCount + 1);
        }
      }
    }

    // Convert to array
    for (const [date, viewCount] of dateMap.entries()) {
      timeSeries.push({ date, views: viewCount });
    }

    // Sort by date ascending
    timeSeries.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate unique viewers
    const uniqueViewers = new Set((views || []).map((v: { user_id: string }) => v.user_id)).size;

    // Calculate average view duration
    const viewsWithDuration = (views || []).filter((v: { duration_seconds?: number }) => v.duration_seconds);
    const avgDuration =
      viewsWithDuration.length > 0
        ? viewsWithDuration.reduce((sum: number, v: { duration_seconds?: number }) => sum + (v.duration_seconds || 0), 0) /
          viewsWithDuration.length
        : 0;

    // Calculate completion rate
    const completedViews = (views || []).filter((v: { completed?: boolean }) => v.completed).length;
    const completionRate =
      (views || []).length > 0 ? (completedViews / (views || []).length) * 100 : 0;

    return NextResponse.json({
      data: {
        viewCount: resource.view_count,
        downloadCount: resource.download_count,
        bookmarkCount: resource.bookmark_count,
        uniqueViewers,
        avgDurationSeconds: Math.round(avgDuration),
        completionRate: Math.round(completionRate),
        timeSeries,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/resources/[id]/analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
