import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, error } = await getAuthedSupabase();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error: fetchError } = await supabase
      .from('resource_folders')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !data) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Unexpected error in GET /api/resources/folders/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: existing, error: fetchError } = await supabase
      .from('resource_folders')
      .select('id, created_by')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

    const isAdmin = isResourceAdmin(role);
    if (!isAdmin && existing.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof body?.name === 'string') updatePayload.name = body.name;
    if (typeof body?.description === 'string') updatePayload.description = body.description;
    if (typeof body?.color === 'string') updatePayload.color = body.color;
    if (typeof body?.icon === 'string') updatePayload.icon = body.icon;

    const { data, error: updateError } = await supabase.from('resource_folders').update(updatePayload).eq('id', id).select('*').single();
    if (updateError || !data) {
      console.error('Error updating folder:', updateError);
      return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/resources/folders/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: existing, error: fetchError } = await supabase
      .from('resource_folders')
      .select('id, created_by')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

    const isAdmin = isResourceAdmin(role);
    if (!isAdmin && existing.created_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { error: deleteError } = await supabase.from('resource_folders').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (deleteError) {
      console.error('Error deleting folder:', deleteError);
      return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/resources/folders/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
