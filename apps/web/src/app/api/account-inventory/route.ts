import { getActiveUserRole } from '@/lib/auth/active-role';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = await getActiveUserRole(authData.user.id);
  if (role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { data: accounts, error } = await admin
    .from('users')
    .select(
      'id, role, status, account_kind, account_purpose, sponsor_user_id, access_expires_at, created_at, deleted_at'
    )
    .neq('account_kind', 'workforce')
    .order('created_at', { ascending: false });
  if (error)
    return NextResponse.json({ error: 'Failed to load account inventory' }, { status: 500 });

  const authUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(
    (authUsers.data.users ?? []).map((user) => [user.id, user.email ?? null])
  );
  return NextResponse.json({
    data: (accounts ?? []).map((account) => ({
      ...account,
      email: emailById.get(account.id) ?? null,
    })),
  });
}
