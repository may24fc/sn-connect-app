import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'hr', 'ceo', 'cos'];

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

/**
 * GET /api/users/[id]/metadata
 * Returns role metadata for a user. Self-access or admin access.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization: self or admin
    const isSelf = user.id === targetUserId;
    if (!isSelf) {
      let role = user.app_metadata?.db_role as string | undefined;
      if (!role) {
        role = (await getUserRole(supabase, user.id)) ?? undefined;
      }
      if (!role || !ADMIN_ROLES.includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('user_role_metadata')
      .select('*')
      .eq('user_id', targetUserId)
      .order('role_type', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch metadata', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error('Error fetching user role metadata:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/users/[id]/metadata
 * Create or update role metadata for a user. Self-access or admin access.
 * Body: { role_type: string, metadata: Record<string, unknown> }
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization: self or admin
    const isSelf = user.id === targetUserId;
    if (!isSelf) {
      let role = user.app_metadata?.db_role as string | undefined;
      if (!role) {
        role = (await getUserRole(supabase, user.id)) ?? undefined;
      }
      if (!role || !['admin', 'super_admin', 'hr'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { role_type, metadata } = body;

    if (!role_type || typeof role_type !== 'string') {
      return NextResponse.json(
        { error: 'Validation error', details: 'role_type is required and must be a string' },
        { status: 400 }
      );
    }

    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return NextResponse.json(
        { error: 'Validation error', details: 'metadata is required and must be an object' },
        { status: 400 }
      );
    }

    // Validate role_type against allowed values
    const ALLOWED_ROLE_TYPES = [
      'google_ads_specialist',
      'content_creator',
      'developer',
      'designer',
      'project_manager',
      'hr_specialist',
      'finance',
      'sales',
      'marketing',
      'operations',
      'other',
    ];

    if (!ALLOWED_ROLE_TYPES.includes(role_type)) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: `Invalid role_type. Allowed values: ${ALLOWED_ROLE_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Upsert: create or update based on user_id + role_type unique constraint
    const { data, error } = await supabase
      .from('user_role_metadata')
      .upsert(
        {
          user_id: targetUserId,
          role_type,
          metadata,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,role_type' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update metadata', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error updating user role metadata:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id]/metadata?role_type=xxx
 * Delete role metadata for a user.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSelf = user.id === targetUserId;
    if (!isSelf) {
      let role = user.app_metadata?.db_role as string | undefined;
      if (!role) {
        role = (await getUserRole(supabase, user.id)) ?? undefined;
      }
      if (!role || !['admin', 'super_admin', 'hr'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const roleType = searchParams.get('role_type');

    if (!roleType) {
      return NextResponse.json(
        { error: 'Validation error', details: 'role_type query parameter is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('user_role_metadata')
      .delete()
      .eq('user_id', targetUserId)
      .eq('role_type', roleType);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete metadata', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting user role metadata:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
