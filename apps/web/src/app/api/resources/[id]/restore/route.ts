import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin } from '../../_lib';

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

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error: restoreError } = await supabase
      .from('resources')
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
      console.error('Error restoring resource:', restoreError);
      return NextResponse.json({ error: 'Failed to restore resource' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/resources/[id]/restore:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
