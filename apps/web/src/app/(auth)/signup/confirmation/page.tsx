'use client';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hr-portal/ui';
import { Mail } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';

function ConfirmationContent(): ReactNode {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? 'your email';

  return (
    <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-card">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="flex flex-col items-center mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <Mail className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>

          <CardTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Check your email
          </CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400">
            We sent a confirmation link to{' '}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
            Click the link in the email to verify your account and get started. If you do not see
            the email, check your spam folder.
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/login" className="w-full">
              <Button
                type="button"
                className="h-10 w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-md transition-colors focus:ring-2 focus:ring-indigo-600/20 focus:ring-offset-2"
                size="lg"
              >
                Back to Sign in
              </Button>
            </Link>
          </div>

          <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
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

export default function SignupConfirmationPage(): ReactNode {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <p className="text-zinc-500">Loading...</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
