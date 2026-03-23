import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../_lib';

export async function GET(_: NextRequest) {
  try {
    const { user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createSupabaseAdminClient();

    const { data: stars, error: starsError } = await adminClient
      .from('announcement_stars')
      .select(`
        id,
        announcement_id,
        user_id,
        created_at,
        announcement:announcements (
          id,
          title,
          content,
          excerpt,
          category,
          priority,
          status,
          published_at,
          expires_at,
          is_pinned,
          allow_comments,
          has_attachments,
          author_id,
          read_count,
          created_at,
          updated_at,
          deleted_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (starsError) {
      // PGRST205: table not found (migration not yet applied) — return empty list gracefully
      if (starsError.code === 'PGRST205') {
        return NextResponse.json({ data: [] }, { status: 200 });
      }
      console.error('Error fetching starred announcements:', starsError);
      return NextResponse.json({ error: 'Failed to fetch starred announcements' }, { status: 500 });
    }

    // Filter out stars where the announcement is deleted or not published
    const valid = (stars || []).filter((s) => {
      const ann = s.announcement as { status?: string; deleted_at?: string | null } | null;
      return ann && ann.status === 'published' && !ann.deleted_at;
    });

    return NextResponse.json({ data: valid });
  } catch (error) {
    console.error('Unexpected error in GET /api/announcements/starred:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
