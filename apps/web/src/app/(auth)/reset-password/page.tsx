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
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type BrowserSupabaseClient = NonNullable<ReturnType<typeof createSupabaseBrowserClient>>;
type RecoveryTokens = {
  accessToken: string;
  refreshToken: string;
};

const INVALID_RESET_LINK_MESSAGE = 'This reset link is invalid or expired. Please request a new one.';

function getRecoveryTokens(hash: string): RecoveryTokens | null {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (!(accessToken && refreshToken)) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
  };
}

function getRecoveryError(hash: string): string | null {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  return hashParams.get('error_description') ?? hashParams.get('error');
}

async function ensureRecoverySession(
  supabase: BrowserSupabaseClient,
  recoveryTokens: RecoveryTokens | null
): Promise<{ hasSession: boolean; errorMessage?: string }> {
  const { data: existingSessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    return { hasSession: false, errorMessage: sessionError.message };
  }

  if (existingSessionData.session) {
    return { hasSession: true };
  }

  if (!recoveryTokens) {
    return { hasSession: false };
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: recoveryTokens.accessToken,
    refresh_token: recoveryTokens.refreshToken,
  });

  if (error) {
    return { hasSession: false, errorMessage: INVALID_RESET_LINK_MESSAGE };
  }

  return { hasSession: Boolean(data.session) };
}

export default function ResetPasswordPage(): ReactNode {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const recoveryTokensRef = useRef<RecoveryTokens | null>(null);

  useEffect(() => {
    const checkSession = async (): Promise<void> => {
      if (!supabase) {
        setError('Authentication is not configured. Please contact support.');
        setIsReady(true);
        return;
      }

      const currentHash = window.location.hash;
      const recoveryError = getRecoveryError(currentHash);
      const recoveryTokens = getRecoveryTokens(currentHash);

      if (recoveryTokens) {
        recoveryTokensRef.current = recoveryTokens;
      }

      if (recoveryError) {
        setError(recoveryError);
        setIsReady(true);
        return;
      }

      const sessionState = await ensureRecoverySession(supabase, recoveryTokensRef.current);

      if (!sessionState.hasSession) {
        setError(sessionState.errorMessage ?? INVALID_RESET_LINK_MESSAGE);
        setIsReady(true);
        return;
      }

      if (recoveryTokens) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }

      setIsReady(true);
    };

    void checkSession();
  }, [supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError('');

    if (!supabase) {
      setError('Authentication is not configured. Please contact support.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const sessionState = await ensureRecoverySession(supabase, recoveryTokensRef.current);

    if (!sessionState.hasSession) {
      setError(sessionState.errorMessage ?? INVALID_RESET_LINK_MESSAGE);
      setIsLoading(false);
      return;
    }

    let { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError?.message === 'Auth session missing!') {
      const retrySessionState = await ensureRecoverySession(supabase, recoveryTokensRef.current);

      if (retrySessionState.hasSession) {
        ({ error: updateError } = await supabase.auth.updateUser({ password }));
      }
    }

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setIsComplete(true);
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Preparing reset</CardTitle>
            <CardDescription className="mt-2">Checking your reset link...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl">Password updated</CardTitle>
            <CardDescription className="mt-2">
              You can now sign in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Back to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set a new password</CardTitle>
          <CardDescription className="mt-2">
            Choose a strong password to secure your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <div className="flex items-start gap-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3.5 text-sm text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-2 fade-in duration-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}
            <FormGroup
              label="New Password"
              htmlFor="password"
              required
              showOptional={false}
              description="Must be at least 8 characters"
              icon={<Lock className="h-3.5 w-3.5" />}
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
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
              icon={<Lock className="h-3.5 w-3.5" />}
            >
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
                  aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                  aria-pressed={showConfirmPassword}
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
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating...
                </span>
              ) : (
                'Update password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
