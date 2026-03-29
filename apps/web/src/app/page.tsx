import { getAuthenticatedHomeRedirect } from '@/lib/auth/redirect-config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

interface UserRoleRecord {
  role: string | null;
  status: string | null;
}

export default async function Home(): Promise<ReactNode> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const metadataRole = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;

  const { data: userRecord } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  const resolvedUser = userRecord as UserRoleRecord | null;

  redirect(
    getAuthenticatedHomeRedirect(
      resolvedUser?.role ?? metadataRole,
      resolvedUser?.status ?? null
    )
  );
}
