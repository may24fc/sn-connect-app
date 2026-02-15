import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../_lib';

export async function GET(_: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error: fetchError } = await supabase
      .from('resources')
      .select('*')
      .eq('status', 'published')
      .eq('is_featured', true)
      .is('deleted_at', null)
      .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('display_order', { ascending: true })
      .order('published_at', { ascending: false })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching featured resources:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch featured resources' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Unexpected error in GET /api/resources/featured:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
