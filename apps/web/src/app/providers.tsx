'use client';

import { createQueryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type ReactNode, useState } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Application providers wrapper component.
 *
 * Wraps the application with:
 * - QueryClientProvider for TanStack Query data fetching
 * - ReactQueryDevtools for development debugging (only visible in dev mode)
 *
 * Uses useState to create QueryClient once per component lifecycle,
 * avoiding re-creation on every render while maintaining SSR compatibility.
 */
export function Providers({ children }: ProvidersProps): ReactNode {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
