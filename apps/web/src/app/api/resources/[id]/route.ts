import { updateResourceSchema } from '@/lib/schemas/resource.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin, normalizeExcerpt } from '../_lib';

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

    const query = supabase.from('resources').select('*').eq('id', id).is('deleted_at', null);

    const { data, error: fetchError } = await query.single();

    if (fetchError || !data) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/resources/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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
    const parsed = updateResourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Map camelCase to snake_case
    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.description !== undefined) {
      updatePayload.description = payload.description;
      // Update excerpt if description changed and excerpt not explicitly provided
      if (payload.excerpt === undefined) {
        updatePayload.excerpt = normalizeExcerpt(payload.description, null);
      }
    }
    if (payload.excerpt !== undefined) updatePayload.excerpt = payload.excerpt;
    if (payload.resourceType !== undefined) updatePayload.resource_type = payload.resourceType;
    if (payload.category !== undefined) updatePayload.category = payload.category;
    if (payload.subcategory !== undefined) updatePayload.subcategory = payload.subcategory;
    if (payload.tags !== undefined) updatePayload.tags = payload.tags;
    if (payload.filePath !== undefined) updatePayload.file_path = payload.filePath;
    if (payload.externalUrl !== undefined) updatePayload.external_url = payload.externalUrl;
    if (payload.thumbnailPath !== undefined) updatePayload.thumbnail_path = payload.thumbnailPath;
    if (payload.fileSize !== undefined) updatePayload.file_size = payload.fileSize;
    if (payload.mimeType !== undefined) updatePayload.mime_type = payload.mimeType;
    if (payload.durationSeconds !== undefined)
      updatePayload.duration_seconds = payload.durationSeconds;
    if (payload.status !== undefined) updatePayload.status = payload.status;
    if (payload.publishedAt !== undefined) updatePayload.published_at = payload.publishedAt;
    if (payload.expiresAt !== undefined) updatePayload.expires_at = payload.expiresAt;
    if (payload.isPublic !== undefined) updatePayload.is_public = payload.isPublic;
    if (payload.targetRoles !== undefined) updatePayload.target_roles = payload.targetRoles;
    if (payload.targetDepartments !== undefined)
      updatePayload.target_departments = payload.targetDepartments;
    if (payload.targetEmployees !== undefined)
      updatePayload.target_employees = payload.targetEmployees;
    if (payload.isFeatured !== undefined) updatePayload.is_featured = payload.isFeatured;
    if (payload.isPinned !== undefined) updatePayload.is_pinned = payload.isPinned;
    if (payload.displayOrder !== undefined) updatePayload.display_order = payload.displayOrder;

    const { data, error: patchError } = await supabase
      .from('resources')
      .update(updatePayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (patchError || !data) {
      console.error('Error updating resource:', patchError);
      return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/resources/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('resources')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (deleteError) {
      console.error('Error deleting resource:', deleteError);
      return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/resources/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
