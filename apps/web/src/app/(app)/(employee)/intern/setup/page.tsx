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
} from '@hr-portal/ui';
import {
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';

export default function InternSetupPage(): ReactNode {
  const { user } = useAuth();
  const router = useRouter();
  const isPendingOnboarding = user?.status === 'pending_onboarding';
  const primaryActionHref = isPendingOnboarding ? '/onboarding/setup' : '/associate/dashboard';
  const primaryActionLabel = isPendingOnboarding ? 'Continue Onboarding' : 'Go to Dashboard';
  const secondaryActionHref = isPendingOnboarding
    ? '/associate/profile'
    : '/onboarding/awaiting-approval';
  const secondaryActionLabel = isPendingOnboarding ? 'View Profile' : 'View Onboarding Status';

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-900/30">
            <GraduationCap
              className="h-5 w-5 text-slate-700 dark:text-zinc-400"
              strokeWidth={1.5}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Internship Assignment Pending
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {user?.name ? `Hi ${user.name},` : 'Hi,'} your internship details are assigned by an administrator.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/10">
          <AlertCircle
            className="h-5 w-5 text-slate-700 dark:text-zinc-400 flex-shrink-0 mt-0.5"
            strokeWidth={1.5}
          />
          <div className="text-sm text-slate-800 dark:text-zinc-200">
            <p className="font-medium">This step is no longer self-service</p>
            <p className="mt-1 text-slate-700 dark:text-zinc-300">
              Department assignment, internship dates, required hours, school, and program are now
              managed by HR or an administrator. You only need to complete the shared onboarding
              wizard and then wait for your internship assignment to be added.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">Admin Managed</Badge>
              <Badge variant="outline">Read Only</Badge>
            </div>
            <CardTitle>What happens next</CardTitle>
            <CardDescription>
              {isPendingOnboarding
                ? 'Complete the shared onboarding wizard first. After review, an admin will assign your internship record before reporting and hour tracking become available.'
                : 'Your shared onboarding information is the only form you need to complete. An admin will assign your internship record before reporting and hour tracking become available.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">Assigned by admin</p>
              <p className="mt-1 leading-6">
                Department, internship dates, required hours, school, and program are created from
                the admin assignment flow after your onboarding is reviewed.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">While you wait</p>
              <p className="mt-1 leading-6">
                You can review your profile and onboarding status. Once your internship is assigned,
                your dashboard, reports, and progress tracking will update automatically.
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button onClick={() => router.push(primaryActionHref)}>{primaryActionLabel}</Button>
              <Button variant="outline" onClick={() => router.push(secondaryActionHref)}>
                {secondaryActionLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
