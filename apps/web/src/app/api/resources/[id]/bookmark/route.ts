import { bookmarkResourceSchema } from '@/lib/schemas/resource.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is okay
    }

    const parsed = bookmarkResourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // Check if resource exists
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (resourceError || !resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Check if bookmark already exists
    const { data: existing } = await supabase
      .from('resource_bookmarks')
      .select('id')
      .eq('resource_id', id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Update existing bookmark
      const { data, error: updateError } = await supabase
        .from('resource_bookmarks')
        .update({ notes: payload.notes || null })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating bookmark:', updateError);
        return NextResponse.json({ error: 'Failed to update bookmark' }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    // Create new bookmark (the trigger will increment bookmark_count)
    const { data, error: bookmarkError } = await supabase
      .from('resource_bookmarks')
      .insert({
        resource_id: id,
        user_id: user.id,
        notes: payload.notes || null,
      })
      .select('*')
      .single();

    if (bookmarkError) {
      console.error('Error creating bookmark:', bookmarkError);
      return NextResponse.json({ error: 'Failed to bookmark resource' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/resources/[id]/bookmark:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete bookmark (the trigger will decrement bookmark_count)
    const { error: deleteError } = await supabase
      .from('resource_bookmarks')
      .delete()
      .eq('resource_id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting bookmark:', deleteError);
      return NextResponse.json({ error: 'Failed to remove bookmark' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/resources/[id]/bookmark:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
