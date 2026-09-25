import { ensureOk } from '@/lib/api-error';
import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface AnnouncementComment {
  id: string;
  announcement_id: string;
  user_id: string;
  content: string;
  created_at: string;
  commenter_name: string | null;
}

export interface AnnouncementCommentsResponse {
  data: Array<AnnouncementComment>;
  meta: { allowComments: boolean };
}

export function useAnnouncementComments(
  announcementId?: string | null,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: queryKeys.announcements.comments(announcementId ?? 'unknown'),
    queryFn: async (): Promise<AnnouncementCommentsResponse> => {
      if (!announcementId) {
        return { data: [], meta: { allowComments: false } };
      }

      const response = await fetch(`/api/announcements/${announcementId}/comments`);
      await ensureOk(response, 'Failed to fetch announcement comments');
      return response.json();
    },
    enabled: (options.enabled ?? true) && Boolean(announcementId),
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useCreateAnnouncementComment(announcementId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { content: string }): Promise<{ data: AnnouncementComment }> => {
      if (!announcementId) {
        throw new Error('Announcement ID is required to add a comment');
      }

      const response = await fetch(`/api/announcements/${announcementId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      await ensureOk(response, 'Failed to post announcement comment');
      return response.json();
    },
    onMutate: async ({ content }) => {
      if (!announcementId) return undefined;
      const queryKey = queryKeys.announcements.comments(announcementId);
      await queryClient.cancelQueries({ queryKey });
      const previousComments = queryClient.getQueryData<AnnouncementCommentsResponse>(queryKey);
      const optimisticId = `optimistic-comment-${crypto.randomUUID()}`;
      queryClient.setQueryData<AnnouncementCommentsResponse>(queryKey, (old) =>
        old
          ? {
              ...old,
              data: [
                ...old.data,
                {
                  id: optimisticId,
                  announcement_id: announcementId,
                  user_id: '',
                  content,
                  created_at: new Date().toISOString(),
                  commenter_name: 'You',
                },
              ],
            }
          : old
      );
      return { queryKey, previousComments, optimisticId };
    },
    onSuccess: (response, _payload, context) => {
      if (context) {
        queryClient.setQueryData<AnnouncementCommentsResponse>(context.queryKey, (old) =>
          old
            ? {
                ...old,
                data: old.data.map((comment) =>
                  comment.id === context.optimisticId ? response.data : comment
                ),
              }
            : old
        );
      }
    },
    onError: (_error, _payload, context) => {
      if (context) queryClient.setQueryData(context.queryKey, context.previousComments);
    },
    onSettled: () => {
      if (announcementId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.announcements.comments(announcementId),
        });
      }
    },
  });
}
