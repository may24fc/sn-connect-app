'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  FormGroup,
  Input,
  Label,
  PasswordInput,
} from '@hr-portal/ui';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';

function getDefaultDashboard(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'super_admin':
      return '/super-admin/dashboard';
    case 'intern':
      return '/intern/dashboard';
    default:
      return '/dashboard';
  }
}

export default function LoginPage(): ReactNode {
  const { login, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const enableMockAuth = process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';

  // If user is already authenticated, redirect away from login
  useEffect(() => {
    if (!authLoading && user) {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get('returnTo') || params.get('redirect');
      router.replace(returnTo || getDefaultDashboard(user.role));
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    try {
      await login(normalizedEmail, normalizedPassword);
      // Router navigation is handled by the auth context
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (testEmail: string): Promise<void> => {
    setEmail(testEmail);
    setPassword('password');
    setError('');
    setIsLoading(true);

    try {
      await login(testEmail, 'password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md bg-card border border-border rounded-xl shadow-card">
        <CardHeader className="space-y-1 text-center pb-2">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg mb-4">
              SN
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              SN Connect
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Where Policy Meets Productivity
            </p>
          </div>

          <CardTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Sign in to your account
          </CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3.5 text-sm text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-2 fade-in duration-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <FormGroup
              label="Email Address"
              htmlFor="email"
              required
              showOptional={false}
              icon={<Mail className="h-3.5 w-3.5" />}
            >
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10"
              />
            </FormGroup>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  <Lock className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                  Password
                  <span className="text-rose-500 dark:text-rose-400" aria-label="required">
                    *
                  </span>
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-10 w-full"
              />
            </div>

            <div className="flex items-center space-x-2.5 py-1">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal text-zinc-600 dark:text-zinc-400 cursor-pointer select-none"
              >
                Remember me for 30 days
              </Label>
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-lg transition-all focus:ring-2 focus:ring-indigo-600/20 focus:ring-offset-2 disabled:opacity-60"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {enableMockAuth ? (
            <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-6">
              <p className="mb-3 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Quick Test Login
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin('employee@test.com')}
                  disabled={isLoading}
                  className="h-9 px-3 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <Badge
                    variant="secondary"
                    className="mr-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                  >
                    Employee
                  </Badge>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin('intern@test.com')}
                  disabled={isLoading}
                  className="h-9 px-3 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <Badge
                    variant="secondary"
                    className="mr-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                  >
                    Intern
                  </Badge>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin('admin@test.com')}
                  disabled={isLoading}
                  className="h-9 px-3 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <Badge
                    variant="secondary"
                    className="mr-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                  >
                    Admin
                  </Badge>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickLogin('superadmin@test.com')}
                  disabled={isLoading}
                  className="h-9 px-3 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <Badge
                    variant="secondary"
                    className="mr-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                  >
                    Super Admin
                  </Badge>
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <p>
              Need help?{' '}
              <a
                href="mailto:support@company.com"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                Contact IT Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
