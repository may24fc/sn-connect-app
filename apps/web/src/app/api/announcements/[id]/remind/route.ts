import { createBulkNotifications } from '@/lib/notifications/create';
import { type NextRequest, NextResponse } from 'next/server';
import {
  getAuthedSupabase,
  isAnnouncementAdmin,
  resolveAnnouncementTargetUserIds,
} from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST: Send reminder notifications to all targeted users who haven't read the announcement.
 */
export async function POST(_: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAnnouncementAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the announcement
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select('id, title, status, target_roles, target_departments, target_employees')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (announcementError || !announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    if (announcement.status !== 'published') {
      return NextResponse.json(
        { error: 'Can only send reminders for published announcements' },
        { status: 400 }
      );
    }

    // Get user IDs who have already read
    const { data: readRecords } = await supabase
      .from('announcement_reads')
      .select('user_id')
      .eq('announcement_id', id);

    const readUserIds = new Set((readRecords ?? []).map((r: { user_id: string }) => r.user_id));

    const targetedUserIds = await resolveAnnouncementTargetUserIds(supabase, announcement);

    if (targetedUserIds.length === 0) {
      return NextResponse.json({ data: { notified: 0 } });
    }

    // Filter to unread users
    const unreadUserIds = targetedUserIds.filter((uid: string) => !readUserIds.has(uid));

    if (unreadUserIds.length === 0) {
      return NextResponse.json({
        data: { notified: 0, message: 'All targeted users have already read this announcement' },
      });
    }

    const notified = await createBulkNotifications({
      userIds: unreadUserIds,
      type: 'reminder',
      title: `Reminder: ${announcement.title}`,
      message: 'You have an unread announcement. Please review it.',
      link: `/announcements/${id}`,
      metadata: { announcementId: id, reminderSentBy: user.id },
    });

    return NextResponse.json({
      data: {
        notified,
        totalUnread: unreadUserIds.length,
      },
    });
  } catch (err) {
    console.error('Announcement remind error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
