import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedSupabase, isAnnouncementAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface AnnouncementCommentRow {
  id: string;
  announcement_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface EmployeeNameRow {
  user_id: string;
  first_name: string;
  last_name: string;
}

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000),
});

/**
 * Loads the announcement and confirms the caller may see it. RLS already
 * restricts the row, so a missing row here means "not visible to you"; the
 * route reports 404 rather than leaking which announcements exist.
 */
async function loadVisibleAnnouncement(
  supabase: Awaited<ReturnType<typeof getAuthedSupabase>>['supabase'],
  announcementId: string
): Promise<
  | { ok: true; announcement: { id: string; status: string; allow_comments: boolean } }
  | { ok: false; status: number; error: string }
> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, status, allow_comments')
    .eq('id', announcementId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: 'Failed to load announcement' };
  }

  if (!data) {
    return { ok: false, status: 404, error: 'Announcement not found' };
  }

  return {
    ok: true,
    announcement: data as { id: string; status: string; allow_comments: boolean },
  };
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const visibility = await loadVisibleAnnouncement(supabase, id);

    if (!visibility.ok) {
      return NextResponse.json({ error: visibility.error }, { status: visibility.status });
    }

    const { data, error: listError } = await supabase
      .from('announcement_comments')
      .select('*')
      .eq('announcement_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (listError) {
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    const rows = (data ?? []) as Array<AnnouncementCommentRow>;
    const commenterIds = Array.from(new Set(rows.map((comment) => comment.user_id)));

    let namesByUserId = new Map<string, string>();
    if (commenterIds.length > 0) {
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id, first_name, last_name')
        .in('user_id', commenterIds)
        .is('deleted_at', null);

      namesByUserId = new Map(
        ((employees ?? []) as Array<EmployeeNameRow>).map((employee) => [
          employee.user_id,
          `${employee.first_name} ${employee.last_name}`,
        ])
      );
    }

    return NextResponse.json({
      data: rows.map((comment) => ({
        ...comment,
        commenter_name: namesByUserId.get(comment.user_id) || null,
      })),
      meta: { allowComments: visibility.announcement.allow_comments },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/announcements/[id]/comments:', error);
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

    const visibility = await loadVisibleAnnouncement(supabase, id);

    if (!visibility.ok) {
      return NextResponse.json({ error: visibility.error }, { status: visibility.status });
    }

    const { announcement } = visibility;

    if (!announcement.allow_comments) {
      return NextResponse.json(
        { error: 'Comments are disabled for this announcement' },
        { status: 403 }
      );
    }

    // Unpublished announcements are visible to admins for review, but are not
    // an open discussion surface yet.
    if (announcement.status !== 'published' && !isAnnouncementAdmin(role)) {
      return NextResponse.json(
        { error: 'This announcement is not open for comments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error: insertError } = await supabase
      .from('announcement_comments')
      .insert({
        announcement_id: id,
        user_id: user.id,
        content: parsed.data.content,
      })
      .select('*')
      .single();

    if (insertError || !data) {
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/announcements/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
