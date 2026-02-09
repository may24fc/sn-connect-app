'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

/**
 * Layout for payroll approvals routes with strict role-based access control.
 *
 * Security Rule: Only super_admin can access payroll approvals.
 * Regular admins and other roles cannot view or approve payroll/invoices.
 *
 * @security
 * - Enforces super_admin only access at layout level
 * - Redirects other users to their appropriate dashboard
 * - Client-side guard (should be paired with server-side validation in production)
 */
export default function PayrollApprovalsLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only super_admin can access payroll approvals
    if (!isLoading && user && user.role !== 'super_admin') {
      // Redirect based on role
      if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  // Show loading state while checking authorization
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Block non-super_admin from accessing
  if (user?.role !== 'super_admin') {
    return null; // Router will redirect
  }

  return <>{children}</>;
}
