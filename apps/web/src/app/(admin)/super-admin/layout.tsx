'use client';

import { type ReactNode } from 'react';
import { useRequireAuth } from '@/contexts/AuthContext';

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
  useRequireAuth(['super_admin']);

  // Return children without wrapping UI - parent layout handles that
  return <>{children}</>;
}
