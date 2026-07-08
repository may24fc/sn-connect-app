import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'hr', 'ceo', 'cos'];
const LEADERBOARD_PREF_ROLE_TYPE = 'leaderboard_preferences';

async function getUserRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<string | null> {
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  return userData?.role ?? null;
}

async function authorizeTargetUser(targetUserId: string): Promise<
  | { supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }
  | { response: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const isSelf = user.id === targetUserId;
  if (!isSelf) {
    let role = user.app_metadata?.db_role as string | undefined;
    if (!role) {
      role = (await getUserRole(supabase, user.id)) ?? undefined;
    }

    if (!role || !ADMIN_ROLES.includes(role)) {
      return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
  }

  return { supabase };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
    const authorized = await authorizeTargetUser(targetUserId);

    if ('response' in authorized) {
      return authorized.response;
    }

    const { supabase } = authorized;
    const { data, error } = await supabase
      .from('user_role_metadata')
      .select('metadata')
      .eq('user_id', targetUserId)
      .eq('role_type', LEADERBOARD_PREF_ROLE_TYPE)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to load leaderboard preferences' }, { status: 500 });
    }

    const metadata = (data?.metadata ?? {}) as Record<string, unknown>;
    const featuredDepartment =
      typeof metadata.featured_department === 'string' && metadata.featured_department.trim().length > 0
        ? metadata.featured_department.trim()
        : null;

    return NextResponse.json({
      data: {
        featured_department: featuredDepartment,
      },
    });
  } catch (error) {
    console.error('Error loading leaderboard preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
    const authorized = await authorizeTargetUser(targetUserId);

    if ('response' in authorized) {
      return authorized.response;
    }

    const body = (await request.json()) as { featured_department?: unknown };
    const featuredDepartmentRaw = body.featured_department;

    if (featuredDepartmentRaw !== null && featuredDepartmentRaw !== undefined && typeof featuredDepartmentRaw !== 'string') {
      return NextResponse.json(
        { error: 'Validation error', details: 'featured_department must be a string or null' },
        { status: 400 }
      );
    }

    const featuredDepartment =
      typeof featuredDepartmentRaw === 'string' && featuredDepartmentRaw.trim().length > 0
        ? featuredDepartmentRaw.trim()
        : null;

    const { supabase } = authorized;

    if (featuredDepartment) {
      const { data: masteryRecord, error: masteryError } = await supabase
        .from('user_domain_mastery')
        .select('department')
        .eq('user_id', targetUserId)
        .eq('department', featuredDepartment)
        .maybeSingle();

      if (masteryError) {
        return NextResponse.json({ error: 'Failed to validate featured domain' }, { status: 500 });
      }

      if (!masteryRecord) {
        return NextResponse.json(
          { error: 'Selected mastery domain is not available for this user' },
          { status: 400 }
        );
      }
    }

    const { error: upsertError } = await supabase
      .from('user_role_metadata')
      .upsert(
        {
          user_id: targetUserId,
          role_type: LEADERBOARD_PREF_ROLE_TYPE,
          metadata: { featured_department: featuredDepartment },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,role_type' }
      );

    if (upsertError) {
      return NextResponse.json({ error: 'Failed to update leaderboard preferences' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        featured_department: featuredDepartment,
      },
    });
  } catch (error) {
    console.error('Error updating leaderboard preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
