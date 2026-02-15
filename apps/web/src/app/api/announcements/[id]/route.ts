import { updateAnnouncementSchema } from '@/lib/schemas/announcement.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isAnnouncementAdmin, normalizeExcerpt } from '../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAnnouncementAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error: fetchError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !data) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/announcements/[id]:', error);
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

    if (!isAnnouncementAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateAnnouncementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const updatePayload: Record<string, unknown> = {};

    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.content !== undefined) {
      updatePayload.content = payload.content;
      updatePayload.excerpt = normalizeExcerpt(payload.content, payload.excerpt);
    } else if (payload.excerpt !== undefined) {
      updatePayload.excerpt = payload.excerpt;
    }
    if (payload.category !== undefined) updatePayload.category = payload.category;
    if (payload.priority !== undefined) updatePayload.priority = payload.priority;
    if (payload.status !== undefined) updatePayload.status = payload.status;
    if (payload.publishedAt !== undefined) updatePayload.published_at = payload.publishedAt;
    if (payload.expiresAt !== undefined) updatePayload.expires_at = payload.expiresAt;
    if (payload.targetRoles !== undefined) updatePayload.target_roles = payload.targetRoles;
    if (payload.targetDepartments !== undefined) {
      updatePayload.target_departments = payload.targetDepartments;
    }
    if (payload.targetEmployees !== undefined) {
      updatePayload.target_employees = payload.targetEmployees;
    }
    if (payload.isPinned !== undefined) updatePayload.is_pinned = payload.isPinned;
    if (payload.allowComments !== undefined) {
      updatePayload.allow_comments = payload.allowComments;
    }

    const { data, error: patchError } = await supabase
      .from('announcements')
      .update(updatePayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (patchError || !data) {
      return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/announcements/[id]:', error);
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

    if (!isAnnouncementAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('announcements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/announcements/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
