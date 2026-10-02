import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider } from '@/contexts/AuthContext';
import {
  VERIFIED_AUTH_SNAPSHOT_HEADER,
  parseVerifiedAuthSnapshot,
} from '@/lib/auth/request-snapshot';
import { recordAuthTiming, startAuthTiming } from '@/lib/auth/timing';
import { resolveAuthenticatedUser } from '@/lib/auth/user-bootstrap';
import { createSupabaseServerClient, hasSupabaseAuthEnv } from '@/lib/supabase/server';
import { headers } from 'next/headers';
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
  const requestHeaders = await headers();
  let user = parseVerifiedAuthSnapshot(requestHeaders.get(VERIFIED_AUTH_SNAPSHOT_HEADER));

  // Middleware normally supplies a snapshot from its verified getUser() result.
  // Fall back to direct verification for non-standard runtimes or requests that
  // did not pass through middleware.
  if (!user) {
    const authStartedAt = startAuthTiming();
    const { data, error } = await supabase.auth.getUser();
    recordAuthTiming({
      layer: 'server-layout',
      operation: 'getUser-fallback',
      route: '(app)',
      startedAt: authStartedAt,
    });
    if (error || !data.user) {
      redirect('/login');
    }
    user = data.user;
  }

  if (!user) {
    redirect('/login');
  }

  const bootstrapStartedAt = startAuthTiming();
  const initialUser = await resolveAuthenticatedUser(supabase, user);
  recordAuthTiming({
    layer: 'server-layout',
    operation: 'resolveAuthenticatedUser',
    route: '(app)',
    startedAt: bootstrapStartedAt,
  });

  return (
    <AuthProvider initialUser={initialUser}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
