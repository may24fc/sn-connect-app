import { sendPortalNotificationEmail } from '@/lib/email';
import {
  createNotificationsForUsers,
  getUserDisplayName,
  type NotificationType,
} from '@/lib/notifications/create-notification';
import {
  getAdminNotificationContacts,
  getEmployeeContactByEmployeeId,
} from '@/lib/notifications/recipients';
import { getGmailNotificationEnabledUserIds } from '@/lib/settings/notification-preferences.server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin'];

async function getUserRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  return data?.role ?? null;
}

/**
 * GET /api/profile-change-requests
 * List profile change requests
 * - admin/super_admin: see all (optionally filtered by employee_id or status)
 * - employee/associate: see only their own
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(Number.parseInt(searchParams.get('page_size') || '20', 10), 100);

    let query = supabase
      .from('profile_change_requests')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('requested_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch change requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (err) {
    console.error('Error in GET /api/profile-change-requests:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/profile-change-requests
 * Create a new profile change request
 * Body: { employee_id, changes: { field: { old, new } } }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { employee_id, changes } = body as {
      employee_id: string;
      changes: Record<string, { old: string | null; new: string | null }>;
    };

    if (!employee_id || !changes || Object.keys(changes).length === 0) {
      return NextResponse.json({ error: 'employee_id and changes are required' }, { status: 400 });
    }

    // Verify the employee belongs to this user (unless admin)
    const role = await getUserRole(supabase, user.id);
    if (!role || !ADMIN_ROLES.includes(role)) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('id', employee_id)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (!emp) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('profile_change_requests')
      .insert({
        employee_id,
        requested_by: user.id,
        changes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating change request:', error);
      return NextResponse.json(
        { error: 'Failed to create change request' },
        { status: 500 }
      );
    }

    const [employeeContact, adminContacts, requesterName] = await Promise.all([
      getEmployeeContactByEmployeeId(employee_id),
      getAdminNotificationContacts(user.id),
      getUserDisplayName(user.id),
    ]);

    const changeCount = Object.keys(changes).length;
    const adminIds = adminContacts.map((contact) => contact.userId);
    const employeeDirectoryLink = employeeContact?.userId
      ? `/admin/directory/${employeeContact.userId}`
      : '/admin/directory';

    if (adminIds.length > 0) {
      createNotificationsForUsers(adminIds, {
        type: 'system' as NotificationType,
        title: 'Profile change request pending review',
        message: `${employeeContact?.name || requesterName} submitted ${changeCount} profile update${changeCount === 1 ? '' : 's'} for approval.`,
        link: employeeDirectoryLink,
        metadata: {
          employeeId: employee_id,
          profileChangeRequestId: data.id,
          requestedBy: user.id,
          changeCount,
        },
        sendEmail: false,
      });
    }

    const appBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || '';
    const gmailEnabledUserIds = await getGmailNotificationEnabledUserIds(adminIds);
    await Promise.allSettled(
      adminContacts
        .filter((contact) => contact.email && gmailEnabledUserIds.has(contact.userId))
        .map((contact) =>
          sendPortalNotificationEmail({
            to: contact.email as string,
            subject: 'Profile change request pending approval',
            heading: 'Profile change request pending approval',
            paragraphs: [
              `${employeeContact?.name || requesterName} submitted ${changeCount} profile update${changeCount === 1 ? '' : 's'} that require review.`,
              'Open the employee directory record to review the requested changes and approve or reject them.',
            ],
            actionLabel: 'Review request',
            actionUrl: appBaseUrl ? `${appBaseUrl}${employeeDirectoryLink}` : undefined,
          })
        )
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/profile-change-requests:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
