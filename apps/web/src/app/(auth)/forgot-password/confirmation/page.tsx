'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hr-portal/ui';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';

export default function ForgotPasswordConfirmationPage(): ReactNode {
  const searchParams = useSearchParams();
  const email = useMemo(() => searchParams.get('email') ?? 'your email', [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription className="mt-2">
            We have sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Did not receive the email? Check your spam folder or try another address.
          </p>
          <Button asChild variant="outline" className="w-full">
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
