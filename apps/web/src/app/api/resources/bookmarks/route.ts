import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../_lib';

export async function GET(_: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's bookmarks with resource data
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('resource_bookmarks')
      .select(`
        id,
        resource_id,
        user_id,
        notes,
        created_at,
        resource:resources (
          id,
          title,
          description,
          excerpt,
          resource_type,
          category,
          tags,
          file_path,
          external_url,
          thumbnail_path,
          status,
          view_count
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (bookmarksError) {
      console.error('Error fetching bookmarks:', bookmarksError);
      return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
    }

    // Filter out bookmarks where resource is deleted or not published
    const validBookmarks = (bookmarks || []).filter(
      (b: { resource?: Record<string, unknown> }) => b.resource && (b.resource as Record<string, unknown>).status === 'published'
    );

    return NextResponse.json({ data: validBookmarks });
  } catch (error) {
    console.error('Unexpected error in GET /api/resources/bookmarks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
