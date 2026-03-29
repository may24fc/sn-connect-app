import {
  createNotificationsForUsers,
  getUserDisplayName,
  getUserIdsByRoles,
} from '@/lib/notifications/create-notification';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, isResourceAdmin } from '../../_lib';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { supabase, user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isResourceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error: updateError } = await supabase
      .from('resources')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (updateError || !data) {
      console.error('Error publishing resource:', updateError);
      return NextResponse.json({ error: 'Failed to publish resource' }, { status: 500 });
    }

    // Notify users about the new resource with role-appropriate links
    const publisherName = await getUserDisplayName(user.id);

    // Employee + intern users → /information-hub/resources/{id}
    const employeeUserIds = await getUserIdsByRoles(['employee', 'intern']);
    const employeeRecipients = employeeUserIds.filter((uid) => uid !== user.id);
    if (employeeRecipients.length > 0) {
      createNotificationsForUsers(employeeRecipients, {
        type: 'resource_new',
        title: 'New Resource Available',
        message: `${publisherName} published a new resource: "${data.title}"`,
        link: `/information-hub/resources/${id}`,
        metadata: { resourceId: id },
      });
    }

    // Admin users → /admin/resources/{id}
    const adminUserIds = await getUserIdsByRoles(['admin']);
    const adminRecipients = adminUserIds.filter((uid) => uid !== user.id);
    if (adminRecipients.length > 0) {
      createNotificationsForUsers(adminRecipients, {
        type: 'resource_new',
        title: 'New Resource Available',
        message: `${publisherName} published a new resource: "${data.title}"`,
        link: `/admin/resources/${id}`,
        metadata: { resourceId: id },
      });
    }

    // Super-admin users → /super-admin/resources/{id}
    const superAdminUserIds = await getUserIdsByRoles(['super_admin']);
    const superAdminRecipients = superAdminUserIds.filter((uid) => uid !== user.id);
    if (superAdminRecipients.length > 0) {
      createNotificationsForUsers(superAdminRecipients, {
        type: 'resource_new',
        title: 'New Resource Available',
        message: `${publisherName} published a new resource: "${data.title}"`,
        link: `/super-admin/resources/${id}`,
        metadata: { resourceId: id },
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/resources/[id]/publish:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
