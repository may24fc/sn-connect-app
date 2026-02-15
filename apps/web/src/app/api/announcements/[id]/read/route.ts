import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error: upsertError } = await supabase
      .from('announcement_reads')
      .upsert(
        {
          announcement_id: id,
          user_id: user.id,
          read_at: new Date().toISOString(),
        },
        { onConflict: 'announcement_id,user_id' }
      )
      .select('*')
      .single();

    if (upsertError || !data) {
      return NextResponse.json({ error: 'Failed to mark announcement as read' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/announcements/[id]/read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
