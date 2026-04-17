import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, hasAtsAccess } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, hasAtsGrant, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAtsAccess(role, hasAtsGrant)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error: restoreError } = await supabase
      .from('job_postings')
      .update({
        is_active: true,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select('*')
      .single();

    if (restoreError || !data) {
      console.error('Error restoring job posting:', restoreError);
      return NextResponse.json({ error: 'Failed to restore job posting' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/jobs/[id]/restore:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
