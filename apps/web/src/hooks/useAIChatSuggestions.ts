import { queryKeys } from '@/lib/query-keys';
import type { AIChatSuggestion, AIChatbotLiveSync } from '@hr-portal/ui';
import { useQuery } from '@tanstack/react-query';

export interface AIChatSuggestionsResponse {
  data: AIChatSuggestion[];
  liveSync: AIChatbotLiveSync | null;
}

export function useAIChatSuggestions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.aiKnowledge.suggestions(),
    queryFn: async (): Promise<AIChatSuggestionsResponse> => {
      const response = await fetch('/api/ai/suggestions');

      if (!response.ok) {
        throw new Error('Failed to fetch AI chat suggestions');
      }

      return response.json();
    },
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}