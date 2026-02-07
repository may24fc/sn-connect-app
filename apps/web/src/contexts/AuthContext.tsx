'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

// Type definitions
export type UserRole = 'employee' | 'intern' | 'admin' | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Mock credentials
const MOCK_USERS: Record<string, { password: string; user: User }> = {
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
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  // Initialize auth state from localStorage on mount
  React.useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('auth_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = React.useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockUser = MOCK_USERS[email.toLowerCase()];

      if (!mockUser || mockUser.password !== password) {
        setIsLoading(false);
        throw new Error('Invalid email or password');
      }

      // Store user in state and localStorage
      setUser(mockUser.user);
      localStorage.setItem('auth_user', JSON.stringify(mockUser.user));
      setIsLoading(false);

      // Redirect based on role
      switch (mockUser.user.role) {
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
    [router]
  );

  const logout = React.useCallback((): void => {
    setUser(null);
    localStorage.removeItem('auth_user');
    router.push('/login');
  }, [router]);

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
export function useRequireAuth(allowedRoles?: UserRole[]): User {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !user) {
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
