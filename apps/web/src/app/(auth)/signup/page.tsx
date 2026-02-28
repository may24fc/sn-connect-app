'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormGroup,
  Input,
} from '@hr-portal/ui';
import { AlertCircle, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';

import { getAuthCallbackUrl } from '@/lib/auth/redirect-config';
import { signupSchema } from '@/lib/schemas/auth.schema';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignupPage(): ReactNode {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsLoading(true);

    // Client-side validation with Zod
    const parsed = signupSchema.safeParse({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    if (!supabase) {
      setError('Authentication service is not configured. Please contact IT support.');
      setIsLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            full_name: parsed.data.fullName,
          },
          emailRedirectTo: getAuthCallbackUrl(),
        },
      });

      if (signUpError) {
        // Map common Supabase errors to user-friendly messages.
        if (signUpError.message.includes('already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(signUpError.message);
        }
        setIsLoading(false);
        return;
      }

      // Signup succeeded -- redirect to confirmation page.
      router.push(`/signup/confirmation?email=${encodeURIComponent(parsed.data.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
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
            Create your account
          </CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400">
            Enter your details to get started
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div className="flex items-start gap-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3.5 text-sm text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-2 fade-in duration-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <FormGroup
              label="Full Name"
              htmlFor="fullName"
              required
              showOptional={false}
              error={fieldErrors.fullName}
              icon={<User className="h-3.5 w-3.5" />}
            >
              <Input
                id="fullName"
                type="text"
                placeholder="Juan Dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                error={!!fieldErrors.fullName}
                className="h-10"
              />
            </FormGroup>

            <FormGroup
              label="Email Address"
              htmlFor="email"
              required
              showOptional={false}
              error={fieldErrors.email}
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
                error={!!fieldErrors.email}
                className="h-10"
              />
            </FormGroup>

            <FormGroup
              label="Password"
              htmlFor="password"
              required
              showOptional={false}
              error={fieldErrors.password}
              description={
                !fieldErrors.password
                  ? 'Must be at least 8 characters with uppercase, lowercase, and number'
                  : undefined
              }
              icon={<Lock className="h-3.5 w-3.5" />}
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  error={!!fieldErrors.password}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormGroup>

            <FormGroup
              label="Confirm Password"
              htmlFor="confirmPassword"
              required
              showOptional={false}
              error={fieldErrors.confirmPassword}
              icon={<Lock className="h-3.5 w-3.5" />}
            >
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  error={!!fieldErrors.confirmPassword}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </FormGroup>

            <Button
              type="submit"
              className="h-11 w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-lg transition-all focus:ring-2 focus:ring-indigo-600/20 focus:ring-offset-2 disabled:opacity-60"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <p>
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
