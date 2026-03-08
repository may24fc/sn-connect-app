import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedSupabase, isStandupAdmin } from './_lib';

const standupFiltersSchema = z.object({
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

const createStandupSchema = z.object({
  title: z.string().min(1).max(255),
  recording_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  file_path: z.string().min(1),
  file_size: z.number().int().positive().optional(),
  duration_seconds: z.number().int().positive().optional(),
  attendees: z.array(z.string().uuid()).optional().default([]),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = standupFiltersSchema.safeParse({
      search: searchParams.get('search') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const filters = parsed.data;

    let query = supabase
      .from('standup_recordings')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('recording_date', { ascending: false });

    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }
    if (filters.startDate) {
      query = query.gte('recording_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('recording_date', filters.endDate);
    }

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    const { data, error: listError, count } = await query.range(from, to);

    if (listError) {
      console.error('Error fetching standup recordings:', listError);
      return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/standups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isStandupAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createStandupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const { data, error: createError } = await supabase
      .from('standup_recordings')
      .insert({
        title: payload.title,
        recording_date: payload.recording_date,
        file_path: payload.file_path,
        file_size: payload.file_size ?? null,
        duration_seconds: payload.duration_seconds ?? null,
        attendees: payload.attendees,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (createError || !data) {
      console.error('Error creating standup recording:', createError);
      return NextResponse.json({ error: 'Failed to create recording' }, { status: 500 });
    }

    // Fire-and-forget transcription (non-blocking)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      fetch(`${supabaseUrl}/functions/v1/transcribe-recording`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recording_id: data.id }),
      }).catch((err: unknown) => console.error('Failed to trigger transcription:', err));
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/standups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
