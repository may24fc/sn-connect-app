import { type NextRequest, NextResponse } from 'next/server';
import { EVENT_CATEGORIES, getEventAuthedContext, isAdminRole } from './_lib';

/**
 * GET /api/company-events
 *
 * Lists company events. Supports time-range filtering.
 * All authenticated users can read.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const result = await getEventAuthedContext();
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabase } = result.context;
    const { searchParams } = new URL(request.url);

    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');
    const category = searchParams.get('category');
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? '50')));

    let query = supabase
      .from('company_events')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('start_time', { ascending: true });

    if (timeMin) {
      query = query.gte('start_time', timeMin);
    }
    if (timeMax) {
      query = query.lte('start_time', timeMax);
    }
    if (category && EVENT_CATEGORIES.includes(category as typeof EVENT_CATEGORIES[number])) {
      query = query.eq('category', category);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch company events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
      },
    });
  } catch (err) {
    console.error('GET /api/company-events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/company-events
 *
 * Creates a new company event. Admin-only.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const result = await getEventAuthedContext();
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { supabase, user, role } = result.context;

    if (!isAdminRole(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, start_time, end_time, all_day, location, category, department_id } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!start_time || !end_time) {
      return NextResponse.json({ error: 'Start and end times are required' }, { status: 400 });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    const eventCategory = category ?? 'company';
    if (!EVENT_CATEGORIES.includes(eventCategory)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${EVENT_CATEGORIES.join(', ')}` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('company_events')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        all_day: Boolean(all_day),
        location: location?.trim() || null,
        category: eventCategory,
        department_id: department_id || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create company event:', error);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('POST /api/company-events error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
