'use client';

import AdminExpensesDashboard from '@/app/(admin)/admin/expenses/page';
import { useAuth } from '@/contexts/AuthContext';
import { useExpensesAccess } from '@/hooks/useExpensesAccess';
import { Button } from '@hr-portal/ui';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EmployeeExpensesDeskPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { canAccess, isLoading } = useExpensesAccess();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-center">
        <div className="max-w-md space-y-4">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || !canAccess) {
    return (
      <div className="flex h-screen items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-center">
        <div className="max-w-md space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Forbidden Access</h2>
          <p className="text-zinc-500 text-sm">
            Only Accounting members and System Administrators are authorized to access the expense desk workspace.
          </p>
          <Button onClick={() => router.push('/dashboard')} className="bg-indigo-600 text-white">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <AdminExpensesDashboard />;
}
