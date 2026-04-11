'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@hr-portal/ui';
import { AlertTriangle, CheckCircle2, Clock, FilePenLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

function formatReviewDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AwaitingApprovalPage(): ReactNode {
  const router = useRouter();
  const { logout } = useAuth();
  const profileQuery = useOnboardingProfile();
  const profile = profileQuery.data?.data ?? null;
  const isRejected = profile?.review_state === 'rejected';
  const rejectedAtLabel = formatReviewDate(profile?.rejected_at);
  const rejectionNotes = profile?.rejection_notes?.trim();

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4 dark:from-zinc-950 dark:to-zinc-900">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center pb-4">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
              isRejected ? 'bg-rose-100 dark:bg-rose-950/40' : 'bg-warning/10'
            }`}
          >
            {isRejected ? (
              <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
            ) : (
              <Clock className="h-8 w-8 text-warning" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isRejected ? 'Changes Requested' : 'Onboarding Submitted!'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {isRejected ? (
            <>
              <div className="flex justify-center">
                <Badge variant="rejected">Rejected</Badge>
              </div>

              <p className="text-muted-foreground">
                An admin reviewed your onboarding submission and requested updates before approval.
                Open your form, make the requested changes, and submit it again for review.
              </p>

              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-left dark:border-rose-900 dark:bg-rose-950/20">
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                  Reviewer notes
                </p>
                <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
                  {rejectionNotes ||
                    'The admin team requested updates to your onboarding submission. Review each section and resubmit when ready.'}
                </p>
              </div>

              {(rejectedAtLabel || (profile?.rejection_count ?? 0) > 0) && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-left dark:border-zinc-800 dark:bg-zinc-900/60">
                  {rejectedAtLabel ? (
                    <p className="text-sm text-muted-foreground">
                      Last reviewed on <span className="font-medium text-foreground">{rejectedAtLabel}</span>
                    </p>
                  ) : null}
                  {(profile?.rejection_count ?? 0) > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Submission returned for revision <span className="font-medium text-foreground">{profile?.rejection_count}</span>{' '}
                      {(profile?.rejection_count ?? 0) === 1 ? 'time' : 'times'}.
                    </p>
                  ) : null}
                </div>
              )}

              <div className="pt-2 space-y-3">
                <Button onClick={() => router.push('/onboarding/setup')} className="w-full">
                  <FilePenLine className="mr-2 h-4 w-4" />
                  Review and Resubmit
                </Button>
                <Button variant="outline" onClick={() => void handleLogout()} className="w-full">
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-center gap-1 text-success">
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
            </>
          )}

          <p className="text-xs text-muted-foreground pt-2">
            If you have any questions, please contact HR at{' '}
            <a href="mailto:hr@24fitclub.com.au" className="text-primary hover:underline">
              hr@24fitclub.com.au
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
