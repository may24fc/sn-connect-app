'use client';

import { useRequireAuth } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

/**
 * Admin Layout - Passthrough
 *
 * Only enforces role-based access. The parent `(app)` layout renders the shared
 * AppShell (sidebar, header, chatbot) so it stays mounted when moving between
 * admin and self-service routes.
 *
 * @security
 * - Enforces admin / super_admin access (client-side UX guard; RLS and API
 *   route checks remain the real boundary)
 */
export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const user = useRequireAuth(['admin', 'super_admin']);

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
