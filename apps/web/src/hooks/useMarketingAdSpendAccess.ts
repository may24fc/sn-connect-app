'use client';

import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

interface MarketingAdSpendAccessResponse {
  canAccess: boolean;
  hasGrant: boolean;
  role: string | null;
}

interface MarketingAdSpendAccessEnvelope {
  data: MarketingAdSpendAccessResponse;
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: fallbackMessage }));
    throw new Error(payload.error || fallbackMessage);
  }

  return response.json() as Promise<T>;
}

export function useMarketingAdSpendAccess(enabled = true) {
  return useQuery({
    queryKey: queryKeys.marketing.adSpend.access(),
    enabled,
    queryFn: async (): Promise<MarketingAdSpendAccessResponse> => {
      const response = await fetch('/api/marketing/access');
      const payload = await readJson<MarketingAdSpendAccessEnvelope>(
        response,
        'Failed to load marketing ad spend access'
      );
      return payload.data;
    },
    staleTime: 60 * 1000,
  });
}
