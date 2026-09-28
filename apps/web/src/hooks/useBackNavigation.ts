'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface UseBackNavigationOptions {
  fallbackPath: string;
}

/**
 * Navigates to an explicit parent location.
 * Priority: safe returnTo param -> fallback path.
 *
 * Deliberately avoids browser history so controls labelled "Back to X" always
 * lead to X. Call router.back() directly for intentionally history-based UI.
 */
export function useBackNavigation({ fallbackPath }: UseBackNavigationOptions): () => void {
  const router = useRouter();
  const searchParams = useSearchParams();

  return useCallback(() => {
    const returnTo = searchParams.get('returnTo');

    if (
      returnTo?.startsWith('/') &&
      !returnTo.startsWith('//') &&
      !returnTo.includes('\\')
    ) {
      router.push(returnTo);
      return;
    }

    router.push(fallbackPath);
  }, [fallbackPath, router, searchParams]);
}
