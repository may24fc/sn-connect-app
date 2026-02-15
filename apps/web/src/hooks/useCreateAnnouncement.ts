import { queryKeys } from '@/lib/query-keys';
import type { CreateAnnouncementInput } from '@/lib/schemas/announcement.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AnnouncementRecord } from './useAnnouncements';

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateAnnouncementInput): Promise<{ data: AnnouncementRecord }> => {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create announcement');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}
