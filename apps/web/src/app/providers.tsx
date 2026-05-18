'use client';

import { ApplicationUpdateProvider } from '@/components/ApplicationUpdateProvider';
import { createQueryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ReactNode, useState } from 'react';

interface ProvidersProps {
  children: ReactNode;
  initialVersion: string;
}

/**
 * Application providers wrapper component.
 *
 * Wraps the application with:
 * - ThemeProvider for light/dark mode support (uses class strategy)
 * - QueryClientProvider for TanStack Query data fetching
 * - ReactQueryDevtools for development debugging (only visible in dev mode)
 *
 * Uses useState to create QueryClient once per component lifecycle,
 * avoiding re-creation on every render while maintaining SSR compatibility.
 */
export function Providers({ children, initialVersion }: ProvidersProps): ReactNode {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <ApplicationUpdateProvider initialVersion={initialVersion}>
          {children}
        </ApplicationUpdateProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
