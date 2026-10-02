import { AuthProvider, type User, useAuth } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  replace: vi.fn(),
  resolveAuthenticatedUser: vi.fn(),
  signInWithPassword: vi.fn(),
}));

type AuthStateCallback = (
  event: string,
  session: { user?: { id: string; email?: string | null } } | null
) => Promise<void>;

let authStateCallback: AuthStateCallback | undefined;

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: mocks.getSession,
      getUser: mocks.getUser,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: mocks.signInWithPassword,
      signOut: vi.fn(),
    },
  }),
}));

vi.mock('@/lib/auth/user-bootstrap', () => ({
  resolveAuthenticatedUser: mocks.resolveAuthenticatedUser,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn(), refresh: vi.fn() }),
}));

function AuthState({
  onLogin,
}: { onLogin?: (login: ReturnType<typeof useAuth>['login']) => void }) {
  const auth = useAuth();
  onLogin?.(auth.login);
  return <div>{`${auth.isLoading ? 'loading' : 'ready'}:${auth.user?.name ?? 'anonymous'}`}</div>;
}

function renderProvider(children: ReactNode, initialUser?: User) {
  const queryClient = new QueryClient();
  const clear = vi.spyOn(queryClient, 'clear');
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
    </QueryClientProvider>
  );

  return { clear, invalidateQueries };
}

describe('AuthProvider optimized bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    authStateCallback = undefined;
    mocks.onAuthStateChange.mockImplementation((callback: AuthStateCallback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
  });

  afterEach(cleanup);

  it('renders a server-preloaded user immediately without browser session hydration', () => {
    renderProvider(<AuthState />, {
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'employee',
      status: 'active',
      isOnboardingComplete: true,
    });

    expect(screen.getByText('ready:Jane Doe')).toBeInTheDocument();
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('clears old query data and replaces the route without a global refetch', async () => {
    let login!: ReturnType<typeof useAuth>['login'];
    const resolvedUser: User = {
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'employee',
      status: 'active',
      isOnboardingComplete: true,
    };
    mocks.signInWithPassword.mockImplementation(async () => {
      const authUser = { id: 'user-1', email: 'jane@example.com' };
      await authStateCallback?.('SIGNED_IN', { user: authUser });
      return { data: { user: authUser }, error: null };
    });
    mocks.resolveAuthenticatedUser.mockResolvedValue(resolvedUser);
    const { clear, invalidateQueries } = renderProvider(
      <AuthState
        onLogin={(nextLogin) => {
          login = nextLogin;
        }}
      />
    );

    await waitFor(() => expect(screen.getByText('ready:anonymous')).toBeInTheDocument());
    await act(() => login('jane@example.com', 'password'));

    expect(clear).toHaveBeenCalledOnce();
    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(mocks.resolveAuthenticatedUser).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith('/dashboard');
  });
});
