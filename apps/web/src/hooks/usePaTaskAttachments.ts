import { queryKeys } from '@/lib/query-keys';
import type { PaTaskAttachment } from '@/types/pa-task.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface PaTaskAttachmentsResponse {
  data: PaTaskAttachment[];
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: fallbackMessage }));
    throw new Error(payload.error || fallbackMessage);
  }
  return response.json() as Promise<T>;
}

export function usePaTaskAttachments(taskId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.paTasks.attachments(taskId ?? ''),
    queryFn: async (): Promise<PaTaskAttachmentsResponse> => {
      if (!taskId) {
        throw new Error('Task id is required');
      }
      const response = await fetch(`/api/pa-tasks/${taskId}/attachments`);
      return readJson<PaTaskAttachmentsResponse>(response, 'Failed to fetch task attachments');
    },
    enabled: Boolean(taskId),
  });
}

export function useCreatePaTaskAttachment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload:
      | { attachmentType: 'link'; title: string; url: string }
      | {
          attachmentType: 'file';
          title: string;
          file: File;
        }): Promise<{ data: PaTaskAttachment }> => {
      const response =
        payload.attachmentType === 'file'
          ? await (async () => {
              const formData = new FormData();
              formData.append('title', payload.title);
              formData.append('file', payload.file);
              return fetch(`/api/pa-tasks/${taskId}/attachments`, {
                method: 'POST',
                body: formData,
              });
            })()
          : await fetch(`/api/pa-tasks/${taskId}/attachments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
      return readJson<{ data: PaTaskAttachment }>(response, 'Failed to create task attachment');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.attachments(taskId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.detail(taskId) });
    },
  });
}

export function useDeletePaTaskAttachment(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string): Promise<void> => {
      const response = await fetch(`/api/pa-tasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      await readJson<{ data: { id: string } }>(response, 'Failed to delete task attachment');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.attachments(taskId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.detail(taskId) });
    },
  });
}
