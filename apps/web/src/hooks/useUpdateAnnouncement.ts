import { queryKeys } from '@/lib/query-keys';
import type { UpdateAnnouncementInput } from '@/lib/schemas/announcement.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AnnouncementRecord } from './useAnnouncements';

export function useUpdateAnnouncement(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateAnnouncementInput): Promise<{ data: AnnouncementRecord }> => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update announcement');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.detail(id) });
    },
  });
}
