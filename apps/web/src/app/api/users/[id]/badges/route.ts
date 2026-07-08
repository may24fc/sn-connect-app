import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;

/**
 * GET /api/users/[id]/badges
 * Returns all earned badges for a user, joined with badge_definitions.
 * Auth: user reads own; admin/hr/super_admin reads any.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Allow own user or privileged roles
  if (user.id !== targetUserId) {
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: requester } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = requester?.role ?? '';
    if (!ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from('user_badges')
    .select(`
      id,
      badge_id,
      earned_at,
      source_metadata,
      badge_definitions (
        id,
        name,
        description,
        department,
        icon,
        rarity
      )
    `)
    .eq('user_id', targetUserId)
    .order('earned_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
