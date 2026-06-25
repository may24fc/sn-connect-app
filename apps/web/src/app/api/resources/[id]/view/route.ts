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
      // The initial lookup uses the request's Supabase session client which is
      // subject to Row Level Security (RLS). If the resource exists but the
      // current user is not allowed to SELECT it, the query will return no row
      // instead of a clear "not found". To provide a clearer response, fall
      // back to an admin lookup to determine whether the resource truly does
      // not exist (404) or exists but is access-restricted (403).
      try {
        const adminClient = createSupabaseAdminClient();
        const { data: adminResource, error: adminErr } = await adminClient
          .from('resources')
          .select('id, author_id')
          .eq('id', id)
          .is('deleted_at', null)
          .maybeSingle();

        if (adminErr) {
          console.error('Admin lookup failed while resolving resource visibility:', adminErr);
          return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
        }

        if (adminResource) {
          // If the current user is the author of the resource, allow them to track a view
          // even when RLS prevents a session-level SELECT. Otherwise, forbid.
          if (adminResource.author_id === user.id) {
            // fall through to insert view record below
          } else {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        }

        // Resource truly does not exist
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
      } catch (adminLookupError) {
        console.error('Error during admin resource lookup:', adminLookupError);
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
      }
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
