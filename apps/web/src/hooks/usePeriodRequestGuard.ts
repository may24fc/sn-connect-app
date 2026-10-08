'use client';

import { useCallback, useRef } from 'react';

/** Prevent a response for an older selection or request from replacing the current view. */
export function usePeriodRequestGuard(period: string) {
  const selectedPeriodRef = useRef(period);
  const requestIdRef = useRef(0);
  selectedPeriodRef.current = period;

  const begin = useCallback(() => {
    requestIdRef.current += 1;
    return requestIdRef.current;
  }, []);
  const isCurrent = useCallback(
    (requestedPeriod: string, requestId: number) =>
      selectedPeriodRef.current === requestedPeriod && requestIdRef.current === requestId,
    []
  );

  return { begin, isCurrent };
}
