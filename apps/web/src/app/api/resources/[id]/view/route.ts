import { trackViewSchema } from '@/lib/schemas/resource.schema';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
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

    const parsed = trackViewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // Check if resource exists and is accessible
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (resourceError || !resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    const adminClient = createSupabaseAdminClient();

    // Insert view record (the trigger will increment view_count)
    const { error: viewError } = await adminClient.from('resource_views').insert({
      resource_id: id,
      user_id: user.id,
      duration_seconds: payload.durationSeconds || null,
      completed: payload.completed,
    });

    if (viewError) {
      console.error('Error tracking resource view:', viewError);
      return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in POST /api/resources/[id]/view:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
