'use client';

import { getAuthenticatedHomeRedirect } from '@/lib/auth/redirect-config';
import { useAuth } from '@/contexts/AuthContext';
import {
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
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';

export default function LoginPage(): ReactNode {
  const { login, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  // If user is already authenticated, redirect away from login
  useEffect(() => {
    if (!authLoading && user) {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get('returnTo') || params.get('redirect');
      const defaultRedirect = getAuthenticatedHomeRedirect(user.role, user.status);
      const shouldBypassReturnTo =
        user.status === 'pending_onboarding' || user.status === 'awaiting_approval';

      router.replace(shouldBypassReturnTo ? defaultRedirect : returnTo || defaultRedirect);
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

  return (
    <div className="h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card border border-border rounded-xl shadow-card">
        <CardHeader className="space-y-1 text-center pb-2">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/sn-logo.png"
              alt="SN International logo"
              width={60}
              height={10}
              priority
              className="mb-4 h-6 w-auto object-contain"
              sizes="60px"
            />
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Control Hub
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Where Policy Meets Productivity
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-3 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-md">
              For SN International Group employees and interns only
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
                  className="text-xs text-slate-700 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300 font-medium transition-colors"
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
              className="w-full"
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

          <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <p>
              Need help with your account?{' '}
              <a
                href="mailto:hr@24fitclub.com.au"
                className="text-slate-700 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
              >
                Contact HR Support at hr@24fitclub.com.au
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
