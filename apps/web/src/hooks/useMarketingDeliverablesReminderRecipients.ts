'use client';

import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface MarketingDeliverablesReminderRecipient {
  employeeId: string;
  fullName: string;
  position: string | null;
  included: boolean;
}

interface RecipientsResponse {
  data: Array<MarketingDeliverablesReminderRecipient>;
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: fallbackMessage }));
    throw new Error(payload.error || fallbackMessage);
  }

  return response.json() as Promise<T>;
}

export function useMarketingDeliverablesReminderRecipients(enabled = true) {
  return useQuery({
    queryKey: queryKeys.reports.marketingDeliverablesReminderRecipients(),
    enabled,
    queryFn: async (): Promise<RecipientsResponse> => {
      const response = await fetch('/api/reports/marketing-deliverables-reminder-recipients');
      return readJson<RecipientsResponse>(response, 'Failed to load reminder recipients');
    },
  });
}

export function useUpdateMarketingDeliverablesReminderRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, included }: { employeeId: string; included: boolean }) => {
      const response = await fetch('/api/reports/marketing-deliverables-reminder-recipients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, included }),
      });

      return readJson<{ data: { employeeId: string; included: boolean } }>(
        response,
        'Failed to update reminder recipient'
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reports.marketingDeliverablesReminderRecipients(),
      });
    },
  });
}
