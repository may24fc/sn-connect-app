import {
  getAuthenticatedHomeRedirect,
  validateRedirectTarget,
} from '@/lib/auth/redirect-config';
import { createSupabaseServerClient, hasSupabaseAuthEnv } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import LoginForm from './LoginForm';

interface UserRoleRecord {
  role: string | null;
  status: string | null;
}

interface LoginPageProps {
  searchParams: Promise<{
    returnTo?: string;
    redirect?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps): Promise<ReactNode> {
  const useMockAuth =
    process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true' &&
    process.env.NODE_ENV !== 'production';

  // Mock sessions live in localStorage and cannot be resolved by a Server Component.
  if (useMockAuth || !hasSupabaseAuthEnv()) {
    return <LoginForm waitForClientAuth />;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    // Let the browser client recover a valid cookie session after transient auth errors.
    return <LoginForm waitForClientAuth />;
  }

  if (!user) {
    return <LoginForm />;
  }

  const metadataRole =
    typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;

  const { data: userRecord } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  const resolvedUser = userRecord as UserRoleRecord | null;
  const role = resolvedUser?.role ?? metadataRole;
  const status = resolvedUser?.status ?? null;
  const defaultRedirect = getAuthenticatedHomeRedirect(role, status);
  const params = await searchParams;
  const returnTo = validateRedirectTarget(
    params.returnTo ?? params.redirect,
    defaultRedirect
  );

  redirect(getAuthenticatedHomeRedirect(role, status, returnTo));
}
