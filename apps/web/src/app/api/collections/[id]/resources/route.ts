import { addResourceToCollectionSchema } from '@/lib/schemas/resource.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin } from '../../../resources/_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error: listError } = await supabase
      .from('collection_resources')
      .select('display_order, resources(*)')
      .eq('collection_id', id)
      .order('display_order', { ascending: true });

    if (listError) {
      return NextResponse.json({ error: 'Failed to fetch collection resources' }, { status: 500 });
    }

    const resources = (data || [])
      .map((item: { resources: unknown | null }) => item.resources)
      .filter(Boolean);
    return NextResponse.json({ data: resources });
  } catch (error) {
    console.error('Unexpected error in GET /api/collections/[id]/resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = addResourceToCollectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const { error: insertError } = await supabase.from('collection_resources').insert({
      collection_id: id,
      resource_id: payload.resourceId,
      display_order: payload.displayOrder,
    });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to add resource to collection' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/collections/[id]/resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resourceId = request.nextUrl.searchParams.get('resourceId');
    if (!resourceId) {
      return NextResponse.json({ error: 'resourceId is required' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('collection_resources')
      .delete()
      .eq('collection_id', id)
      .eq('resource_id', resourceId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to remove resource from collection' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/collections/[id]/resources:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
