'use client';

import type { UserRole as DbUserRole } from '@hr-portal/database';
import { UserRole } from '@hr-portal/database';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// Type definitions
export type UserRoleType = 'employee' | 'intern' | 'admin' | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRoleType;
  avatarUrl?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

type RoleMappingMode = 'option-a' | 'option-b';

const ROLE_MAPPING_MODE = (process.env.NEXT_PUBLIC_ROLE_MAPPING_MODE ?? 'option-a') as RoleMappingMode;

const optionARoleMap: Record<DbUserRole, UserRoleType> = {
  [UserRole.Admin]: 'admin',
  [UserRole.HR]: 'admin',
  [UserRole.COS]: 'admin',
  [UserRole.CEO]: 'admin',
  [UserRole.SuperAdmin]: 'super_admin',
  [UserRole.Employee]: 'employee',
  [UserRole.Intern]: 'intern',
};

const optionBRoleMap: Record<DbUserRole, UserRoleType> = {
  [UserRole.Admin]: 'admin',
  [UserRole.HR]: 'admin',
  [UserRole.COS]: 'super_admin',
  [UserRole.CEO]: 'admin',
  [UserRole.SuperAdmin]: 'super_admin',
  [UserRole.Employee]: 'employee',
  [UserRole.Intern]: 'intern',
};

const resolveUiRole = (role: string | null | undefined): UserRoleType => {
  const isKnownRole = Object.values(UserRole).includes(role as DbUserRole);
  const normalizedRole = (isKnownRole ? role : UserRole.Employee) as DbUserRole;
  const roleMap = ROLE_MAPPING_MODE === 'option-b' ? optionBRoleMap : optionARoleMap;
  return roleMap[normalizedRole] ?? 'employee';
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const enableMockAuth = process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';
  const useMock = enableMockAuth || !supabase;

  // Mock users for local/dev mode when Supabase is not configured
  const MOCK_USERS: Record<string, { password: string; user: User }> = React.useMemo(
    () => ({
      'employee@test.com': {
        password: 'password',
        user: {
          id: 'emp-1',
          name: 'John Doe',
          email: 'employee@test.com',
          role: 'employee',
        },
      },
      'intern@test.com': {
        password: 'password',
        user: {
          id: 'int-1',
          name: 'Jane Smith',
          email: 'intern@test.com',
          role: 'intern',
        },
      },
      'admin@test.com': {
        password: 'password',
        user: {
          id: 'adm-1',
          name: 'Admin User',
          email: 'admin@test.com',
          role: 'admin',
        },
      },
      'superadmin@test.com': {
        password: 'password',
        user: {
          id: 'sad-1',
          name: 'Super Admin',
          email: 'superadmin@test.com',
          role: 'super_admin',
        },
      },
    }),
    []
  );

  const buildUserFromSession = React.useCallback(
    async (authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null): Promise<User | null> => {
      if (!authUser) {
        return null;
      }


      // If mock auth is enabled (or supabase client missing), use mock mapping
      if (useMock) {
        const mock = MOCK_USERS[authUser.email ?? '']?.user ?? null;
        if (mock) return mock;
        return {
          id: authUser.id,
          name: (authUser.user_metadata?.name as string) ?? authUser.email ?? 'User',
          email: authUser.email ?? '',
          role: 'employee',
        } as User;
      }

      // Primary: read role from app_metadata (embedded in JWT, no DB call)
      let dbRole: string | null = null;
      if (typeof authUser.app_metadata?.db_role === 'string') {
        dbRole = authUser.app_metadata.db_role;
      }

      // Fallback: query public.users directly (RLS allows own-row reads)
      if (!dbRole) {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', authUser.id)
          .maybeSingle();

        if (error) {
          console.error('Failed to fetch user role:', error.message);
        } else {
          dbRole = data?.role ?? null;
        }
      }

      const nameFromMetadata =
        typeof authUser.user_metadata?.full_name === 'string'
          ? authUser.user_metadata.full_name
          : typeof authUser.user_metadata?.name === 'string'
            ? authUser.user_metadata.name
            : authUser.email ?? 'User';

      const avatarUrlFromMetadata =
        typeof authUser.user_metadata?.avatar_url === 'string'
          ? authUser.user_metadata.avatar_url
          : undefined;

      return {
        id: authUser.id,
        name: nameFromMetadata,
        email: authUser.email ?? '',
        role: resolveUiRole(dbRole),
        ...(avatarUrlFromMetadata ? { avatarUrl: avatarUrlFromMetadata } : {}),
      } satisfies User;
    },
    [supabase]
  );

  const syncAuthState = React.useCallback(
    async (authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null): Promise<User | null> => {
      const nextUser = await buildUserFromSession(authUser);
      setUser(nextUser);
      return nextUser;
    },
    [buildUserFromSession]
  );

  React.useEffect(() => {
    let isMounted = true;

    const loadUser = async (): Promise<void> => {
      if (useMock) {
        try {
          const stored = localStorage.getItem('auth_user');
          if (stored) {
            const parsed = JSON.parse(stored) as User;
            setUser(parsed);
          }
        } catch (err) {
          console.error('Failed to parse stored mock user:', err);
          localStorage.removeItem('auth_user');
        }
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error('Failed to load session user:', error.message);
      }

      await syncAuthState(data.user ?? null);
      setIsLoading(false);
    };

    void loadUser();

    let subscription: { subscription: { unsubscribe: () => void } } | null = null;
    if (!useMock) {
      const result = supabase!.auth.onAuthStateChange(async (_event: string, session: { user?: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } } | null) => {
        await syncAuthState(session?.user ?? null);
      });
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
  }, [supabase, syncAuthState]);

  const login = React.useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);
      if (useMock) {
        // Mock login
        await new Promise((r) => setTimeout(r, 500));
        const mock = MOCK_USERS[email.toLowerCase()];
        if (!mock || mock.password !== password) {
          setIsLoading(false);
          throw new Error('Invalid email or password');
        }

        setUser(mock.user);
        try {
          localStorage.setItem('auth_user', JSON.stringify(mock.user));
        } catch (_) {
          // ignore
        }
        setIsLoading(false);
        switch (mock.user.role) {
          case 'employee':
            router.push('/dashboard');
            break;
          case 'intern':
            router.push('/intern/dashboard');
            break;
          case 'admin':
            router.push('/admin/dashboard');
            break;
          case 'super_admin':
            router.push('/super-admin/dashboard');
            break;
          default:
            router.push('/dashboard');
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setIsLoading(false);
        throw new Error(error.message);
      }

      const nextUser = await syncAuthState(data.user ?? null);
      setIsLoading(false);

      if (!nextUser) {
        throw new Error('Unable to load user profile.');
      }

      switch (nextUser.role) {
        case 'employee':
          router.push('/dashboard');
          break;
        case 'intern':
          router.push('/intern/dashboard');
          break;
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'super_admin':
          router.push('/super-admin/dashboard');
          break;
        default:
          router.push('/dashboard');
      }
    },
    [router, supabase, syncAuthState]
  );

  const logout = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    if (useMock) {
      try {
        localStorage.removeItem('auth_user');
      } catch (_) {
        // ignore
      }
      setUser(null);
      setIsLoading(false);
      router.push('/login');
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Failed to sign out:', error.message);
    }

    setUser(null);
    setIsLoading(false);
    router.push('/login');
  }, [router, supabase]);

  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
      isAuthenticated: !!user,
    }),
    [user, isLoading, login, logout]
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
export function useRequireAuth(allowedRoles?: Array<UserRoleType>): User {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!(isLoading || user)) {
      router.push('/login');
    } else if (user && allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard if unauthorized
      switch (user.role) {
        case 'employee':
          router.push('/dashboard');
          break;
        case 'intern':
          router.push('/intern/dashboard');
          break;
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'super_admin':
          router.push('/super-admin/dashboard');
          break;
      }
    }
  }, [user, isLoading, allowedRoles, router]);

  // Wait for loading to complete before throwing error
  if (isLoading) {
    // Return a placeholder during loading to prevent crashes
    // The component will re-render once loading completes
    return null as unknown as User;
  }

  if (!user) {
    throw new Error('User not authenticated');
  }

  return user;
}
