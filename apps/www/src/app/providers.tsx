'use client';

import { createQueryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }): ReactNode {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
