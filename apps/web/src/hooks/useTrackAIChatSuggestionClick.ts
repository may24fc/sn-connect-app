import { useMutation } from '@tanstack/react-query';

export interface TrackAIChatSuggestionClickPayload {
  suggestionId: string;
  label: string;
  prompt: string;
  surface: 'admin_chatbot';
  path: string;
  conversationId?: string | null;
  wasFirstMessage?: boolean;
}

export function useTrackAIChatSuggestionClick() {
  return useMutation({
    mutationFn: async (payload: TrackAIChatSuggestionClickPayload): Promise<void> => {
      const response = await fetch('/api/ai/suggestions/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to track AI suggestion click');
      }
    },
    retry: false,
  });
}