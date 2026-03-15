import { type NextRequest, NextResponse } from 'next/server';
import { EVENT_CATEGORIES, getEventAuthedContext, isAdminRole } from '../_lib';

/**
 * PATCH /api/company-events/[id]
 *
 * Updates a company event. Admin-only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const result = await getEventAuthedContext();
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabase, role } = result.context;

    if (!isAdminRole(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, start_time, end_time, all_day, location, category, department_id } = body;

    // Build update payload – only include fields that were sent
    const update: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 1) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      update.title = title.trim();
    }
    if (description !== undefined) update.description = description?.trim() || null;
    if (location !== undefined) update.location = location?.trim() || null;
    if (all_day !== undefined) update.all_day = Boolean(all_day);
    if (department_id !== undefined) update.department_id = department_id || null;

    if (category !== undefined) {
      if (!EVENT_CATEGORIES.includes(category)) {
        return NextResponse.json({ error: `Invalid category. Must be one of: ${EVENT_CATEGORIES.join(', ')}` }, { status: 400 });
      }
      update.category = category;
    }

    if (start_time !== undefined) {
      const d = new Date(start_time);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid start_time' }, { status: 400 });
      }
      update.start_time = d.toISOString();
    }
    if (end_time !== undefined) {
      const d = new Date(end_time);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid end_time' }, { status: 400 });
      }
      update.end_time = d.toISOString();
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('company_events')
      .update(update)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Failed to update company event:', error);
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('PATCH /api/company-events/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/company-events/[id]
 *
 * Soft-deletes a company event. Admin-only.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const result = await getEventAuthedContext();
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabase, role } = result.context;

    if (!isAdminRole(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('company_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      console.error('Failed to delete company event:', error);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/company-events/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
