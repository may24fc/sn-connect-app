import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isAnnouncementAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function setPinned(id: string, value: boolean) {
  const { supabase, user, role, error } = await getAuthedSupabase();

  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAnnouncementAdmin(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error: pinError } = await supabase
    .from('announcements')
    .update({ is_pinned: value })
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (pinError || !data) {
    return NextResponse.json({ error: 'Failed to update pin state' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(_: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return setPinned(id, true);
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return setPinned(id, false);
}
