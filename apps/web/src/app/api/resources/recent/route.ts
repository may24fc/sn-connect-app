import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../_lib';

export async function GET(_: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's recently viewed resources
    const { data: views, error: viewsError } = await supabase
      .from('resource_views')
      .select('resource_id, viewed_at')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(20);

    if (viewsError) {
      console.error('Error fetching recent views:', viewsError);
      return NextResponse.json({ error: 'Failed to fetch recent resources' }, { status: 500 });
    }

    if (!views || views.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get unique resource IDs in order
    const resourceIds = [...new Set(views.map((v: { resource_id: string }) => v.resource_id))].slice(0, 10);

    // Fetch the resources
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select('*')
      .in('id', resourceIds)
      .eq('status', 'published')
      .is('deleted_at', null);

    if (resourcesError) {
      console.error('Error fetching resources:', resourcesError);
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }

    // Sort resources by the order of resourceIds
    const sortedResources = resourceIds
      .map((id) => (resources || []).find((r: { id: string }) => r.id === id))
      .filter(Boolean);

    return NextResponse.json({ data: sortedResources });
  } catch (error) {
    console.error('Unexpected error in GET /api/resources/recent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
