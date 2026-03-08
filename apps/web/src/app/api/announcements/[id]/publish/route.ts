import {
  createNotificationsForUsers,
  getUserDisplayName,
  getUserIdsByRoles,
} from '@/lib/notifications/create-notification';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isAnnouncementAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAnnouncementAdmin(role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date().toISOString();
    const { data, error: publishError } = await supabase
      .from('announcements')
      .update({ status: 'published', published_at: now })
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (publishError || !data) {
      return NextResponse.json({ error: 'Failed to publish announcement' }, { status: 500 });
    }

    // Notify relevant users about the new announcement
    const publisherName = await getUserDisplayName(user.id);

    // Determine recipients: use target_roles if specified, otherwise all users
    const targetRoles = data.target_roles as string[] | null;
    const recipientIds = targetRoles && targetRoles.length > 0
      ? await getUserIdsByRoles(targetRoles)
      : await getUserIdsByRoles();

    // Exclude the publisher from notifications
    const filteredRecipients = recipientIds.filter((uid) => uid !== user.id);

    createNotificationsForUsers(filteredRecipients, {
      type: 'announcement_new',
      title: 'New Announcement',
      message: `${publisherName} published: "${data.title}"`,
      link: `/announcements`,
      metadata: { announcementId: id },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/announcements/[id]/publish:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
