import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedSupabase, isStandupAdmin } from '../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateStandupSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  recording_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
    .optional(),
  duration_seconds: z.number().int().positive().optional(),
  attendees: z.array(z.string().uuid()).optional(),
  transcript: z.string().optional(),
  summary: z.string().optional(),
});

export async function GET(_: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error: fetchError } = await supabase
      .from('standup_recordings')
      .select('*, standup_topics(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .order('timestamp_start', { referencedTable: 'standup_topics', ascending: true })
      .single();

    if (fetchError || !data) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/standups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isStandupAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateStandupSchema.safeParse(body);

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

    if (payload.title !== undefined) updatePayload.title = payload.title;
    if (payload.recording_date !== undefined) updatePayload.recording_date = payload.recording_date;
    if (payload.duration_seconds !== undefined)
      updatePayload.duration_seconds = payload.duration_seconds;
    if (payload.attendees !== undefined) updatePayload.attendees = payload.attendees;
    if (payload.transcript !== undefined) updatePayload.transcript = payload.transcript;
    if (payload.summary !== undefined) updatePayload.summary = payload.summary;

    const { data, error: patchError } = await supabase
      .from('standup_recordings')
      .update(updatePayload)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (patchError || !data) {
      console.error('Error updating standup recording:', patchError);
      return NextResponse.json({ error: 'Failed to update recording' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/standups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isStandupAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('standup_recordings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (deleteError) {
      console.error('Error deleting standup recording:', deleteError);
      return NextResponse.json({ error: 'Failed to delete recording' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/standups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
