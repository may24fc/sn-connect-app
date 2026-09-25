import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AnnouncementRecord } from './useAnnouncements';

export function usePublishAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ data: AnnouncementRecord }> => {
      const response = await fetch(`/api/announcements/${id}/publish`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish announcement');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}

export function useArchiveAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ data: AnnouncementRecord }> => {
      const response = await fetch(`/api/announcements/${id}/archive`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive announcement');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}

export function useRestoreAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ data: AnnouncementRecord }> => {
      const response = await fetch(`/api/announcements/${id}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to restore announcement');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}

export function useToggleAnnouncementPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const response = await fetch(`/api/announcements/${id}/pin`, {
        method: pinned ? 'POST' : 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update pinned state');
      }

      return response.json();
    },
    onMutate: async ({ id, pinned }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.announcements.all });
      const previousAnnouncements = queryClient.getQueriesData<unknown>({
        queryKey: queryKeys.announcements.all,
      });

      queryClient.setQueriesData<{ data: AnnouncementRecord | Array<AnnouncementRecord> }>(
        { queryKey: queryKeys.announcements.all },
        (old) => {
          if (!old) return old;
          if (Array.isArray(old.data)) {
            return {
              ...old,
              data: old.data.map((announcement) =>
                announcement.id === id ? { ...announcement, is_pinned: pinned } : announcement
              ),
            };
          }
          return old.data.id === id
            ? { ...old, data: { ...old.data, is_pinned: pinned } }
            : old;
        }
      );

      return { previousAnnouncements };
    },
    onError: (_error, _variables, context) => {
      context?.previousAnnouncements.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.detail(variables.id),
      });
    },
  });
}
