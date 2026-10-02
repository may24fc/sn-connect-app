import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider } from '@/contexts/AuthContext';
import { resolveAuthenticatedUser } from '@/lib/auth/user-bootstrap';
import { createSupabaseServerClient, hasSupabaseAuthEnv } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Shared signed-in layout. Every route under `(app)` renders inside one persistent
 * AppShell, so navigating between sections only swaps the page content.
 */
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const useMockAuth =
    process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production';

  // Mock/local auth is restored from localStorage by the client provider.
  if (useMockAuth || !hasSupabaseAuthEnv()) {
    return (
      <AuthProvider>
        <AppShell>{children}</AppShell>
      </AuthProvider>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const initialUser = await resolveAuthenticatedUser(supabase, user);

  return (
    <AuthProvider initialUser={initialUser}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
