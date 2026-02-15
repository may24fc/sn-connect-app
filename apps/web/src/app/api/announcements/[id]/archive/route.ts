import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isAnnouncementAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAnnouncementAdmin(role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error: archiveError } = await supabase
      .from('announcements')
      .update({ status: 'archived' })
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (archiveError || !data) {
      return NextResponse.json({ error: 'Failed to archive announcement' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/announcements/[id]/archive:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
