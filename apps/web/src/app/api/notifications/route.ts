import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedSupabase } from './_lib';

// --- Schemas ---

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z.enum(['true', 'false', 'all']).default('all'),
  type: z.string().optional(),
});

const markReadSchema = z.object({
  id: z.string().uuid(),
});

// --- GET: List notifications for current user ---

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, user, error } = await getAuthedSupabase();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = listQuerySchema.safeParse(searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { page, pageSize, isRead, type } = parsed.data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (isRead === 'true') {
      query = query.eq('is_read', true);
    } else if (isRead === 'false') {
      query = query.eq('is_read', false);
    }

    if (type) {
      query = query.eq('type', type);
    }

    query = query.range(from, to);

    const { data, count, error: queryError } = await query;

    if (queryError) {
      console.error('Failed to fetch notifications:', queryError);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count separately
    const { count: unreadCount, error: unreadError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (unreadError) {
      console.error('Failed to fetch unread count:', unreadError);
    }

    const total = count ?? 0;

    return NextResponse.json({
      data: data ?? [],
      unreadCount: unreadCount ?? 0,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error('Notifications GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- PATCH: Mark a single notification as read ---

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, user, error } = await getAuthedSupabase();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = parsed.data;

    const { data, error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to mark notification as read:', updateError);
      return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Notifications PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- POST: Mark all notifications as read ---

export async function POST(_request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, user, error } = await getAuthedSupabase();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (updateError) {
      console.error('Failed to mark all notifications as read:', updateError);
      return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Notifications POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- DELETE: Delete a notification ---

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, user, error } = await getAuthedSupabase();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const idParsed = z.string().uuid().safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', idParsed.data)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Failed to delete notification:', deleteError);
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Notifications DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
