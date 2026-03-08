import { updateKnowledgeSourceSchema } from '@/lib/schemas/ai.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminClient, getAuthedSupabase, isAiAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAiAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = getAdminClient();

    const { data, error: fetchError } = await adminClient
      .from('knowledge_sources')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !data) {
      return NextResponse.json({ error: 'Knowledge source not found' }, { status: 404 });
    }

    // Also fetch embedding stats for this source
    const { count: chunkCount } = await adminClient
      .from('knowledge_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('source_id', id);

    return NextResponse.json({
      data: {
        ...data,
        chunk_count: chunkCount || 0,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/ai/sources/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAiAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateKnowledgeSourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const adminClient = getAdminClient();

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.description !== undefined) updatePayload.description = payload.description;
    if (payload.sourceType !== undefined) updatePayload.source_type = payload.sourceType;
    if (payload.content !== undefined) updatePayload.content = payload.content;
    if (payload.tags !== undefined) updatePayload.tags = payload.tags;
    if (payload.isActive !== undefined) updatePayload.is_active = payload.isActive;

    const { data, error: patchError } = await adminClient
      .from('knowledge_sources')
      .update(updatePayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (patchError || !data) {
      console.error('Error updating knowledge source:', patchError);
      return NextResponse.json({ error: 'Failed to update knowledge source' }, { status: 500 });
    }

    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'update_knowledge_source',
      resource_type: 'knowledge_source',
      resource_id: id,
      details: { updated_fields: Object.keys(payload) },
    });

    // If content was updated, mark embeddings as stale so they get regenerated
    if (payload.content !== undefined) {
      await adminClient.from('knowledge_embeddings').delete().eq('source_id', id);
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/ai/sources/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAiAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = getAdminClient();

    // Soft delete the knowledge source
    const { error: deleteError } = await adminClient
      .from('knowledge_sources')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (deleteError) {
      console.error('Error deleting knowledge source:', deleteError);
      return NextResponse.json({ error: 'Failed to delete knowledge source' }, { status: 500 });
    }

    // Clean up associated embeddings
    await adminClient.from('knowledge_embeddings').delete().eq('source_id', id);

    await adminClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'delete_knowledge_source',
      resource_type: 'knowledge_source',
      resource_id: id,
      details: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/ai/sources/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
