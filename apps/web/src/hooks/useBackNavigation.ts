'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface UseBackNavigationOptions {
  fallbackPath: string;
}

/**
 * Navigates back to the previous app location.
 * Priority: safe returnTo param -> browser history -> fallback path.
 */
export function useBackNavigation({ fallbackPath }: UseBackNavigationOptions): () => void {
  const router = useRouter();
  const searchParams = useSearchParams();

  return useCallback(() => {
    const returnTo = searchParams.get('returnTo');

    if (returnTo && returnTo.startsWith('/')) {
      router.push(returnTo);
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackPath);
  }, [fallbackPath, router, searchParams]);
}
