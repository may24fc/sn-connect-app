'use client';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hr-portal/ui';
import { ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactNode, Suspense, useCallback, useEffect, useState } from 'react';

const RESEND_COOLDOWN_SECONDS = 60;

function ConfirmationContent(): ReactNode {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? 'your email';

  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async (): Promise<void> => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setResendStatus('idle');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { success: boolean };
      setResendStatus(data.success ? 'sent' : 'error');
      if (data.success) {
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch {
      setResendStatus('error');
    } finally {
      setIsResending(false);
    }
  }, [cooldown, isResending, email]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription className="mt-2">
            We sent a password reset link to{' '}
            <span className="font-medium text-foreground">{email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Spam helper */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <p className="font-medium">Did not receive the email?</p>
            <p className="mt-0.5 text-amber-600 dark:text-amber-500">
              Check your <strong>spam or junk folder</strong>. If you still do not receive it,
              contact your admin.
            </p>
          </div>

          {/* Resend feedback */}
          {resendStatus === 'sent' && (
            <p className="text-center text-sm text-green-600 dark:text-green-400">
              Reset email resent! Check your inbox.
            </p>
          )}
          {resendStatus === 'error' && (
            <p className="text-center text-sm text-rose-600 dark:text-rose-400">
              Failed to resend. Please try again in a moment.
            </p>
          )}

          {/* Resend button with cooldown */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void handleResend()}
            disabled={cooldown > 0 || isResending}
          >
            {isResending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sending...
              </span>
            ) : cooldown > 0 ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Resend email ({cooldown}s)
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Resend email
              </span>
            )}
          </Button>

          <Button asChild variant="ghost" className="w-full">
            <Link href="/forgot-password">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Try another email
            </Link>
          </Button>
          <Button asChild className="w-full">
            <Link href="/login">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ForgotPasswordConfirmationPage(): ReactNode {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  );
}
