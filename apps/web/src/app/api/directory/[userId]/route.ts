import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * GET /api/directory/[userId]
 * Get full employee/intern details from the directory view + employee table
 * Permissions: admin/super_admin only
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    let role: string | null = null;
    if (typeof user.app_metadata?.db_role === 'string') {
      role = user.app_metadata.db_role;
    }
    if (!role) {
      const { data: roleData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      role = roleData?.role ?? null;
    }

    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch from employee_directory view
    const { data: directoryEntry, error: dirError } = await supabase
      .from('employee_directory')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (dirError) {
      return NextResponse.json(
        { error: 'Failed to fetch directory entry', details: dirError.message },
        { status: 500 }
      );
    }

    if (!directoryEntry) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get the auth user email as fallback
    const { data: authUserData } = await supabase.auth.admin.getUserById(userId);

    // Fetch pending change requests for this employee
    let pendingChanges: Array<{
      id: string;
      changes: Record<string, { old: string | null; new: string | null }>;
      requested_at: string;
      status: string;
    }> = [];

    if (directoryEntry.employee_id) {
      const { data: changes } = await supabase
        .from('profile_change_requests')
        .select('id, changes, requested_at, status, review_note, reviewed_at, reviewed_by')
        .eq('employee_id', directoryEntry.employee_id)
        .is('deleted_at', null)
        .order('requested_at', { ascending: false })
        .limit(20);

      pendingChanges = (changes ?? []) as typeof pendingChanges;
    }

    return NextResponse.json({
      data: {
        ...directoryEntry,
        avatar_url: authUserData?.user?.user_metadata?.avatar_url ?? null,
        pending_change_requests: pendingChanges,
      },
    });
  } catch (err) {
    console.error('Error in GET /api/directory/[userId]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
