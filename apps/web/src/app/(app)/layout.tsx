'use client';

import { AppShell } from '@/components/layout/AppShell';
import type { ReactNode } from 'react';

/**
 * Shared signed-in layout. Every route under `(app)` renders inside one persistent
 * AppShell, so navigating between sections only swaps the page content.
 */
export default function AppLayout({ children }: { children: ReactNode }): ReactNode {
  return <AppShell>{children}</AppShell>;
}
