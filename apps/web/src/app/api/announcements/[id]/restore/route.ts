import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isAnnouncementAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAnnouncementAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error: restoreError } = await supabase
      .from('announcements')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'archived')
      .is('deleted_at', null)
      .select('*')
      .single();

    if (restoreError || !data) {
      console.error('Error restoring announcement:', restoreError);
      return NextResponse.json({ error: 'Failed to restore announcement' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/announcements/[id]/restore:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
