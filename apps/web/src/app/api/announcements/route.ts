import { logActivity } from '@/lib/audit';
import {
  announcementFiltersSchema,
  createAnnouncementSchema,
} from '@/lib/schemas/announcement.schema';
import {
  createAnnouncementNotifications,
  getUserDisplayName,
} from '@/lib/notifications/create-notification';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isAnnouncementAdmin, normalizeExcerpt } from './_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAnnouncementAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = announcementFiltersSchema.safeParse({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      priority: searchParams.get('priority') || undefined,
      authorId: searchParams.get('authorId') || undefined,
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
      .from('announcements')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.authorId) query = query.eq('author_id', filters.authorId);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', filters.endDate);

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    const { data, error: listError, count } = await query.range(from, to);

    if (listError) {
      console.error('Error fetching announcements:', listError);
      return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
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
    console.error('Unexpected error in GET /api/announcements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAnnouncementAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createAnnouncementSchema.safeParse(body);

    if (!parsed.success) {
      console.error('Announcement validation failed:', JSON.stringify(parsed.error.flatten()));
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    console.log('Creating announcement with payload:', {
      ...payload,
      content: payload.content.slice(0, 100) + '...', // truncate for logging
    });

    const { data, error: createError } = await supabase
      .from('announcements')
      .insert({
        title: payload.title,
        content: payload.content,
        excerpt: normalizeExcerpt(payload.content, payload.excerpt),
        category: payload.category,
        priority: payload.priority,
        status: payload.status,
        published_at: payload.publishedAt || null,
        expires_at: payload.expiresAt || null,
        target_roles: payload.targetRoles,
        target_departments: payload.targetDepartments,
        target_employees: payload.targetEmployees,
        is_pinned: payload.isPinned,
        allow_comments: payload.allowComments,
        author_id: user.id,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (createError || !data) {
      console.error('Error creating announcement:', createError);
      console.error('Full error details:', JSON.stringify(createError, null, 2));
      return NextResponse.json(
        {
          error: 'Failed to create announcement',
          details: createError?.message || 'Unknown database error',
        },
        { status: 500 }
      );
    }

    // If the announcement is published immediately, notify users
    if (data.status === 'published') {
      const authorName = await getUserDisplayName(user.id);
      const targetRoles = data.target_roles as string[] | null;

      createAnnouncementNotifications(user.id, {
        title: 'New Announcement',
        message: `${authorName} published: "${data.title}"`,
        metadata: { announcementId: data.id },
      }, targetRoles);
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'create_announcement',
      tableName: 'announcements',
      recordId: data.id,
      metadata: { title: data.title, status: data.status },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/announcements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
