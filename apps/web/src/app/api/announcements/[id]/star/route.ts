import { createSupabaseAdminClient } from '@/lib/supabase/server';
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

    // Check the announcement exists and is published
    const { data: announcement, error: annError } = await supabase
      .from('announcements')
      .select('id')
      .eq('id', id)
      .eq('status', 'published')
      .is('deleted_at', null)
      .single();

    if (annError || !announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const adminClient = createSupabaseAdminClient();

    // Upsert — safe if already starred
    const { data, error: starError } = await adminClient
      .from('announcement_stars')
      .upsert(
        { announcement_id: id, user_id: user.id },
        { onConflict: 'announcement_id,user_id', ignoreDuplicates: true }
      )
      .select('*')
      .maybeSingle();

    if (starError) {
      // PGRST205: table not found (migration not yet applied) — silently succeed
      if (starError.code === 'PGRST205') {
        return NextResponse.json({ data: null }, { status: 201 });
      }
      console.error('Error starring announcement:', starError);
      return NextResponse.json({ error: 'Failed to star announcement' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/announcements/[id]/star:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createSupabaseAdminClient();

    const { error: deleteError } = await adminClient
      .from('announcement_stars')
      .delete()
      .eq('announcement_id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      // PGRST205: table not found (migration not yet applied) — silently succeed
      if (deleteError.code === 'PGRST205') {
        return NextResponse.json({ success: true });
      }
      console.error('Error unstarring announcement:', deleteError);
      return NextResponse.json({ error: 'Failed to unstar announcement' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/announcements/[id]/star:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
