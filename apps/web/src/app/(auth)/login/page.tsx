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
  Input,
  Label,
} from '@hr-portal/ui';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, type ReactNode, useState } from 'react';

export default function LoginPage(): ReactNode {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const enableMockAuth = process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';

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
      <Card className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-card">
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3 text-sm text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10 w-full px-4 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10 w-full px-4 pr-10 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <Label htmlFor="remember" className="text-sm font-normal text-zinc-600 dark:text-zinc-400">
                Remember me for 30 days
              </Label>
            </div>

            <Button
              type="submit"
              className="h-10 w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-md transition-colors focus:ring-2 focus:ring-indigo-600/20 focus:ring-offset-2"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
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
              <a href="mailto:support@company.com" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                Contact IT Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
