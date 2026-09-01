'use client';

import { getAuthenticatedHomeRedirect } from '@/lib/auth/redirect-config';
import { getNormalizedMetadataRole, normalizeDbRoleClaim } from '@/lib/auth/role';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { normalizeAuthError } from '@/lib/errors';
import { resolveUserDisplayName } from '@/lib/user-display';
import { useQueryClient } from '@tanstack/react-query';

// Type definitions
export type UserRoleType = 'employee' | 'associate' | 'admin' | 'super_admin';
export type UserStatusType =
  | 'active'
  | 'inactive'
  | 'on_leave'
  | 'terminated'
  | 'pending_onboarding'
  | 'awaiting_approval';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRoleType;
  status?: UserStatusType;
  avatarUrl?: string;
  isOnboardingComplete?: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

// Role mapping is now 1:1 since we simplified the DB roles
// DB roles: employee, associate, admin, super_admin
// UI roles: employee, associate, admin, super_admin
const resolveUiRole = (role: string | null | undefined): UserRoleType => {
  const normalizedRole = normalizeDbRoleClaim(role);

  switch (normalizedRole) {
    case 'super_admin':
      return 'super_admin';
    case 'admin':
    case 'hr':
    case 'cos':
    case 'ceo':
      return 'admin';
    case 'associate':
      return 'associate';
    case 'employee':
    default:
      return 'employee';
  }
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const AUTH_TIMEOUT_MS = 12000;

function getHomeRedirectPath(user: Pick<User, 'role' | 'status'>): string {
  return getAuthenticatedHomeRedirect(user.role, user.status);
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const userRef = React.useRef<User | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const enableMockAuth =
    process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true' &&
    process.env.NODE_ENV !== 'production';
  const useMock = enableMockAuth || !supabase;

  // Mock users for local/dev mode when Supabase is not configured.
  // Keep legacy test.com aliases so existing Playwright specs keep working.
  const MOCK_USERS: Record<string, { password: string; user: User }> = React.useMemo(
    () => ({
      'employee@test.com': {
        password: 'password',
        user: {
          id: 'emp-1',
          name: 'Sample Employee',
          email: 'employee@test.com',
          role: 'employee',
          isOnboardingComplete: true,
        },
      },
      'employee@example.com': {
        password: 'password',
        user: {
          id: 'emp-1',
          name: 'Sample Employee',
          email: 'employee@example.com',
          role: 'employee',
          isOnboardingComplete: true,
        },
      },
      'associate@test.com': {
        password: 'password',
        user: {
          id: 'int-1',
          name: 'Sample Associate',
          email: 'associate@test.com',
          role: 'associate',
          isOnboardingComplete: true,
        },
      },
      'associate@example.com': {
        password: 'password',
        user: {
          id: 'int-1',
          name: 'Sample Associate',
          email: 'associate@example.com',
          role: 'associate',
          isOnboardingComplete: true,
        },
      },
      'admin@test.com': {
        password: 'password',
        user: {
          id: 'adm-1',
          name: 'Admin User',
          email: 'admin@test.com',
          role: 'admin',
          isOnboardingComplete: true,
        },
      },
      'admin@example.com': {
        password: 'password',
        user: {
          id: 'adm-1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
          isOnboardingComplete: true,
        },
      },
      'superadmin@test.com': {
        password: 'password',
        user: {
          id: 'sad-1',
          name: 'Super Admin',
          email: 'superadmin@test.com',
          role: 'super_admin',
          isOnboardingComplete: true,
        },
      },
      'super-admin@example.com': {
        password: 'password',
        user: {
          id: 'sad-1',
          name: 'Super Admin',
          email: 'super-admin@example.com',
          role: 'super_admin',
          isOnboardingComplete: true,
        },
      },
      'superadmin@example.com': {
        password: 'password',
        user: {
          id: 'sad-1',
          name: 'Super Admin',
          email: 'superadmin@example.com',
          role: 'super_admin',
          isOnboardingComplete: true,
        },
      },
    }),
    []
  );

  const buildUserFromSession = React.useCallback(
    async (
      authUser: {
        id: string;
        email?: string | null;
        user_metadata?: Record<string, unknown>;
        app_metadata?: Record<string, unknown>;
      } | null
    ): Promise<User | null> => {
      if (!authUser) {
        return null;
      }

      // If mock auth is enabled (or supabase client missing), use mock mapping
      if (useMock) {
        const mock = MOCK_USERS[authUser.email ?? '']?.user ?? null;
        if (mock) return mock;
        return {
          id: authUser.id,
          name: resolveUserDisplayName({
            metadataFullName:
              typeof authUser.user_metadata?.full_name === 'string'
                ? authUser.user_metadata.full_name
                : null,
            metadataName:
              typeof authUser.user_metadata?.name === 'string'
                ? authUser.user_metadata.name
                : null,
            metadataFirstName:
              typeof authUser.user_metadata?.first_name === 'string'
                ? authUser.user_metadata.first_name
                : null,
            metadataLastName:
              typeof authUser.user_metadata?.last_name === 'string'
                ? authUser.user_metadata.last_name
                : null,
            fallbackEmail: authUser.email ?? null,
          }),
          email: authUser.email ?? '',
          role: 'employee',
        } as User;
      }

      // Primary: read role from app_metadata (embedded in JWT, no DB call)
      let dbRole: string | null = getNormalizedMetadataRole(authUser.app_metadata);

      // Fallback: query public.users directly (RLS allows own-row reads)
      let userStatus: UserStatusType | null = null;
      if (!dbRole) {
        const { data, error } = await supabase
          .from('users')
          .select('role, status')
          .eq('id', authUser.id)
          .maybeSingle();

        if (error) {
          console.error('Failed to fetch user role:', error.message);
        } else {
          dbRole = normalizeDbRoleClaim(data?.role ?? null);
          userStatus = (data?.status as UserStatusType) ?? null;
        }
      } else {
        // If we have role from app_metadata, still need to fetch status
        const { data, error } = await supabase
          .from('users')
          .select('status')
          .eq('id', authUser.id)
          .maybeSingle();

        if (!error && data) {
          userStatus = (data.status as UserStatusType) ?? null;
        }
      }

      const avatarUrlFromMetadata =
        typeof authUser.user_metadata?.avatar_url === 'string'
          ? authUser.user_metadata.avatar_url
          : undefined;

      const resolvedRole = resolveUiRole(dbRole);

      let onboardingProfile:
        | {
            is_completed: boolean | null;
            first_name: string | null;
            last_name: string | null;
          }
        | null = null;
      let isOnboardingComplete = true;

      if (resolvedRole === 'employee' || resolvedRole === 'associate') {
        const { data: onboardingData, error: onboardingError } = await supabase
          .from('onboarding_profiles')
          .select('is_completed, first_name, last_name')
          .eq('user_id', authUser.id)
          .is('deleted_at', null)
          .maybeSingle();

        if (onboardingError) {
          console.warn(
            'Failed to fetch onboarding status; treating onboarding as non-blocking:',
            onboardingError.message
          );
          isOnboardingComplete = true;
        } else {
          onboardingProfile = onboardingData;
          isOnboardingComplete = onboardingData?.is_completed ?? false;
        }
      }

      const resolvedName = resolveUserDisplayName({
        metadataFullName:
          typeof authUser.user_metadata?.full_name === 'string'
            ? authUser.user_metadata.full_name
            : null,
        metadataName:
          typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name : null,
        metadataFirstName:
          typeof authUser.user_metadata?.first_name === 'string'
            ? authUser.user_metadata.first_name
            : null,
        metadataLastName:
          typeof authUser.user_metadata?.last_name === 'string'
            ? authUser.user_metadata.last_name
            : null,
        onboardingFirstName: onboardingProfile?.first_name ?? null,
        onboardingLastName: onboardingProfile?.last_name ?? null,
        fallbackEmail: authUser.email ?? null,
      });

      return {
        id: authUser.id,
        name: resolvedName,
        email: authUser.email ?? '',
        role: resolvedRole,
        status: userStatus ?? 'active',
        isOnboardingComplete,
        ...(avatarUrlFromMetadata ? { avatarUrl: avatarUrlFromMetadata } : {}),
      } satisfies User;
    },
    [MOCK_USERS, supabase, useMock]
  );

  const syncAuthState = React.useCallback(
    async (
      authUser: {
        id: string;
        email?: string | null;
        user_metadata?: Record<string, unknown>;
        app_metadata?: Record<string, unknown>;
      } | null
    ): Promise<User | null> => {
      try {
        const nextUser = await withTimeout(
          buildUserFromSession(authUser),
          AUTH_TIMEOUT_MS,
          'Timed out while resolving user profile.'
        );
        setUser(nextUser);
        return nextUser;
      } catch (err) {
        // Timeout or other transient error while resolving the profile.
        // Do not clear the existing user state; keep the current session active.
        console.warn('syncAuthState: failed to resolve profile, keeping current user:', err);
        return userRef.current ?? null;
      }
    },
    [buildUserFromSession]
  );

  React.useEffect(() => {
    // keep a ref of the latest user to allow syncAuthState to return previous value
    userRef.current = user;

    let isMounted = true;

    const loadUser = async (): Promise<void> => {
      try {
        if (useMock) {
          try {
            const stored = localStorage.getItem('auth_user');
            if (stored) {
              const parsed = JSON.parse(stored) as User;
              if (isMounted) {
                setUser(parsed);
              }
            }
          } catch (err) {
            console.error('Failed to parse stored mock user:', err);
            localStorage.removeItem('auth_user');
          } finally {
            if (isMounted) {
              setIsLoading(false);
            }
          }
          return;
        }

        // FAST PATH: Use getSession() first for instant hydration from cookies.
        // This prevents the flash-to-login on page refresh by setting user state
        // before the slower getUser() network call completes.
        const { data: sessionData } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (sessionData.session?.user) {
          // Hydrate user immediately from the cookie-based session
          await syncAuthState(sessionData.session.user);
          if (!isMounted) return;
          // Mark loading as done — user is visible, no flash
          setIsLoading(false);

          // SECURITY: Validate the JWT with Supabase servers in the background.
          // If the token was revoked, the next server-side request (middleware)
          // will redirect to login. This is non-blocking so the UI doesn't
          // flash while waiting for the round-trip.
          void (async () => {
            try {
              const { data, error: getUserError } = await supabase.auth.getUser();
              if (!isMounted) return;
              if (getUserError || !data.user) {
                // Background validation failed — do NOT clear user state.
                // The session was already validated by getSession() and the
                // middleware. Clearing user here causes a redirect chain
                // (current page → /login → dashboard) on transient errors.
                // The real security boundary is RLS + middleware.
                console.warn('Background session validation failed — keeping current session:', getUserError?.message);
              } else {
                // Sync any updated metadata from the validated session
                await syncAuthState(data.user);
              }
            } catch {
              // Network error during background validation — keep current user.
              // Security is still enforced by RLS at the database level.
            }
          })();
          return;
        }

        // No session in cookies — try getUser() as final check
        const result = await withTimeout(
          supabase.auth.getUser(),
          AUTH_TIMEOUT_MS,
          'Timed out while loading user.'
        );
        const { data, error } = result as any;

        if (!isMounted) return;

        if (error || !data.user) {
          // Genuinely no session — user needs to log in
          setUser(null);
        } else {
          await syncAuthState(data.user);
        }
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
        // Only clear user if no user was already set (e.g. by onAuthStateChange)
        if (isMounted && !userRef.current) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadUser();

    let subscription: { subscription: { unsubscribe: () => void } } | null = null;
    if (!useMock) {
      const result = supabase?.auth.onAuthStateChange(
        async (
          event: string,
          session: {
            user?: {
              id: string;
              email?: string | null;
              user_metadata?: Record<string, unknown>;
              app_metadata?: Record<string, unknown>;
            };
          } | null
        ) => {
          try {
            if (event === 'SIGNED_OUT') {
              // User explicitly signed out — clear state and all cached data
              setUser(null);
              queryClient.clear();
              return;
            }

            // Skip INITIAL_SESSION — loadUser() already handles the initial
            // session hydration via getSession(). Processing it here causes
            // a duplicate syncAuthState race that can resolve with stale data
            // or trigger redundant DB queries.
            if (event === 'INITIAL_SESSION') {
              return;
            }

            // For SIGNED_IN, TOKEN_REFRESHED, etc.
            // only update if the session has a valid user
            if (session?.user) {
              await syncAuthState(session.user);
            }
            // If session is null on a non-SIGNED_OUT event (e.g. transient
            // token refresh state), keep the existing user to avoid flicker
          } catch (err) {
            // swallow transient errors to avoid accidental logout
            console.warn('onAuthStateChange handler failed:', err);
          }
        }
      );
      subscription = result.data;
    }

    return () => {
      isMounted = false;
      if (subscription) {
        try {
          subscription.subscription.unsubscribe();
        } catch (_) {
          // ignore
        }
      }
    };
  }, [supabase, syncAuthState, useMock, queryClient]);

  // keep the ref updated whenever `user` state changes
  React.useEffect(() => {
    userRef.current = user;
  }, [user]);

  const login = React.useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);
      try {
        if (useMock) {
          await new Promise((r) => setTimeout(r, 500));
          const mock = MOCK_USERS[email.toLowerCase()];
          if (!mock || mock.password !== password) {
            throw new Error('Invalid email or password');
          }

          setUser(mock.user);
          try {
            localStorage.setItem('auth_user', JSON.stringify(mock.user));
          } catch (_) {
            // ignore
          }

          // In mock-auth mode, force a hard navigation so Playwright and local
          // development don't depend on App Router state propagation.
          window.location.assign(getHomeRedirectPath(mock.user));
          return;
        }

        const result = await withTimeout(
          supabase.auth.signInWithPassword({
            email,
            password,
          }),
          AUTH_TIMEOUT_MS,
          'Timed out while signing in.'
        );
        const { data, error } = result as any;

        if (error) {
          throw new Error(normalizeAuthError(error.message));
        }

        const nextUser = await syncAuthState(data.user ?? null);

        if (!nextUser) {
          throw new Error('Unable to load user profile.');
        }

        // Invalidate all stale queries after login to ensure fresh data
        await queryClient.invalidateQueries();
        // Refresh router to clear Next.js server-side cache (fixes stale
        // state after signup → email confirmation → login flow)
        router.refresh();

        router.push(getHomeRedirectPath(nextUser));
      } finally {
        setIsLoading(false);
      }
    },
    [MOCK_USERS, queryClient, router, supabase, syncAuthState, useMock]
  );

  const logout = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (useMock) {
        try {
          localStorage.removeItem('auth_user');
        } catch (_) {
          // ignore
        }
        setUser(null);
        queryClient.clear();
        window.location.assign('/login');
        return;
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Failed to sign out:', error.message);
      }

      setUser(null);
      // Clear all cached query data to prevent stale role-specific UI
      // from leaking into the next session
      queryClient.clear();
      router.push('/login');
      // Flush Next.js server-side router cache so no previous-role
      // content is served on the next login
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }, [queryClient, router, supabase, useMock]);

  const refreshUser = React.useCallback(async () => {
    if (useMock || !supabase) return;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return;
      await syncAuthState(data.user);
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  }, [supabase, syncAuthState, useMock]);

  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
      refreshUser,
      isAuthenticated: !!user,
    }),
    [user, isLoading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Role-based route guards
export function useRequireAuth(allowedRoles?: Array<UserRoleType>): User | null {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Track whether we've ever seen a valid user during this component's
  // lifetime. Prevents redirect-to-login when user transiently goes null
  // (e.g. background validation hiccup) after initial hydration succeeded.
  const wasAuthenticatedRef = React.useRef(false);

  React.useEffect(() => {
    if (user) {
      wasAuthenticatedRef.current = true;
    }
  }, [user]);

  React.useEffect(() => {
    const currentPath =
      typeof window !== 'undefined' ? window.location.pathname : '';
    const isAccountDisabledRoute = currentPath === '/account-disabled';
    const isOnboardingRoute = currentPath.startsWith('/onboarding/');
    const isDisabledAccount = user?.status === 'terminated' || user?.status === 'inactive';
    const canAccessOnboardingDuringPendingState =
      isOnboardingRoute &&
      user &&
      (user.status === 'pending_onboarding' || user.status === 'awaiting_approval');

    if (user && isDisabledAccount && !isAccountDisabledRoute) {
      router.replace('/account-disabled');
      return;
    }

    if (!(isLoading || user)) {
      // If we previously had a valid user but now don't, this is likely a
      // transient state (background token refresh, network hiccup). Don't
      // redirect — the middleware will enforce auth on the next server
      // request if the session is truly invalid.
      if (wasAuthenticatedRef.current) {
        return;
      }
      // Preserve the current URL so the user returns here after login
      const currentPathWithSearch = window.location.pathname + window.location.search;
      const returnTo = currentPathWithSearch && currentPathWithSearch !== '/' ? `?returnTo=${encodeURIComponent(currentPathWithSearch)}` : '';
      router.replace(`/login${returnTo}`);
    } else if (
      user &&
      allowedRoles &&
      !allowedRoles.includes(user.role) &&
      !canAccessOnboardingDuringPendingState
    ) {
      // Redirect to appropriate dashboard if unauthorized
      switch (user.role) {
        case 'employee':
          router.replace('/dashboard');
          break;
        case 'associate':
          router.replace('/associate/dashboard');
          break;
        case 'admin':
          router.replace('/admin/dashboard');
          break;
        case 'super_admin':
          router.replace('/super-admin/dashboard');
          break;
      }
    }
  }, [user, isLoading, allowedRoles, router]);

  // Wait for loading to complete before returning an auth result.
  if (isLoading) {
    return null;
  }

  // Return null and let route redirect effect handle navigation.
  // Throwing during render causes Next.js error overlays and can break redirects.
  if (!user) {
    return null;
  }

  return user;
}
