import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hr-portal/ui';
import { LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function OnboardingCompletePage(): ReactNode {
  return (
    <div className="h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Onboarding Completed</CardTitle>
          <CardDescription>
            Your onboarding information has been submitted successfully.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
