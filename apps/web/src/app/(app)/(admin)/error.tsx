'use client';

import { ErrorFallbackUI } from '@/components/feedback';
import type { ReactNode } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactNode {
  return (
    <ErrorFallbackUI
      error={error}
      onRetry={reset}
      className="h-full"
    />
  );
}
