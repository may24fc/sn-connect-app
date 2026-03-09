'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@hr-portal/ui';
import { CheckCircle2, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export default function AwaitingApprovalPage(): ReactNode {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10  ">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <CardTitle className="text-2xl">Onboarding Submitted!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="flex items-start justify-center text-success">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium">Your onboarding form has been submitted successfully.</p>
          </div>

          <p className="text-muted-foreground">
            Your submission is now awaiting review and approval from the admin team. You'll receive
            an email notification once your account has been approved and activated.
          </p>

          <div className="pt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Expected approval time: <span className="font-medium">1-2 business days</span>
            </p>
          </div>

          <div className="pt-6">
            <Button variant="outline" onClick={() => void handleLogout()} className="w-full">
              Sign Out
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            If you have any questions, please contact HR at{' '}
            <a href="mailto:hr@company.com" className="text-primary hover:underline">
              hr@company.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
