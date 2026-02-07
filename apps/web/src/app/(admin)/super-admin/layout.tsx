'use client';

import { useRequireAuth } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

/**
 * Super Admin Layout - Passthrough
 *
 * This layout only enforces role-based access control.
 * The parent (admin) layout handles the UI (sidebar, header, chatbot).
 *
 * @security
 * - Enforces super_admin only access
 * - Parent layout at (admin)/layout.tsx renders the super_admin sidebar variant
 */
export default function SuperAdminLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  // Enforce super_admin access only
  const user = useRequireAuth(['super_admin']);

  // Show loading state while user is being verified
  if (!user) {
    return null;
  }

  // Return children without wrapping UI - parent layout handles that
  return <>{children}</>;
}
