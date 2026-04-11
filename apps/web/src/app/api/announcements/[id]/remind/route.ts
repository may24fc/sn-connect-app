import {
  createNotificationsForUsers,
  getUserDisplayName,
} from '@/lib/notifications/create-notification';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import {
  getAuthedSupabase,
  isAnnouncementAdmin,
  resolveAnnouncementTargetUserIds,
} from '../../_lib';

const ANNOUNCEMENT_LINKS: Record<string, string> = {
  employee: '/announcements',
  intern: '/announcements',
  admin: '/admin/announcements',
  super_admin: '/super-admin/announcements',
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Split unread user IDs by role and send reminders with role-appropriate links. */
async function sendRoleScopedReminders(
  unreadUserIds: string[],
  announcement: { title: string },
  announcementId: string,
  senderId: string,
): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { data: users } = await admin
    .from('users')
    .select('id, role')
    .in('id', unreadUserIds)
    .is('deleted_at', null);

  if (!users || users.length === 0) return 0;

  // Group by announcement link
  const grouped = new Map<string, string[]>();
  for (const u of users) {
    const link = ANNOUNCEMENT_LINKS[u.role as string] ?? '/announcements';
    const list = grouped.get(link) ?? [];
    list.push(u.id);
    grouped.set(link, list);
  }

  let total = 0;
  const senderName = await getUserDisplayName(senderId);
  for (const [link, ids] of grouped) {
    await createNotificationsForUsers(ids, {
      type: 'reminder',
      title: `Reminder: ${announcement.title}`,
      message: `${senderName} reminded you to review "${announcement.title}".`,
      link,
      metadata: { announcementId, reminderSentBy: senderId },
    });
    total += ids.length;
  }
  return total;
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

    const notified = await sendRoleScopedReminders(unreadUserIds, announcement, id, user.id);

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
