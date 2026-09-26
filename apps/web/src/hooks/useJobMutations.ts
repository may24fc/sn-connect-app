import { stageFormDataFiles } from '@/lib/storage/stage-form-data';
import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateJobPayload {
  title: string;
  business_unit_id?: string | null;
  department?: string;
  location?: string;
  total_headcount: number;
  employment_type: string;
  description: string;
  requirements?: string;
  benefits?: string;
  salary_range?: string;
  is_active: boolean;
  closes_at?: string | null;
}

interface UpdateJobPayload extends Partial<CreateJobPayload> {
  id: string;
}

export function useCreateJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateJobPayload) => {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create' }));
        throw new Error(err.error ?? 'Failed to create job posting');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
}

export function useUpdateJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateJobPayload) => {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update' }));
        throw new Error(err.error ?? 'Failed to update job posting');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
}

export function useArchiveJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to archive' }));
        throw new Error(err.error ?? 'Failed to archive job posting');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
}

export function useRestoreJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/jobs/${id}/restore`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to restore' }));
        throw new Error(err.error ?? 'Failed to restore job posting');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: string;
      notes?: string;
    }) => {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update' }));
        throw new Error(err.error ?? 'Failed to update application');
      }
      return res.json();
    },
    onMutate: async ({ id, status, notes }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.applications.all });
      const previousApplications = queryClient.getQueriesData<unknown>({
        queryKey: queryKeys.applications.all,
      });

      queryClient.setQueriesData<{
        data: Array<{ id: string; status: string; notes?: string | null; updated_at?: string }>;
      }>(
        { queryKey: queryKeys.applications.lists() },
        (old) =>
          old
            ? {
                ...old,
                data: old.data.map((application) =>
                  application.id === id
                    ? {
                        ...application,
                        status,
                        ...(notes !== undefined ? { notes } : {}),
                        updated_at: new Date().toISOString(),
                      }
                    : application
                ),
              }
            : old
      );
      queryClient.setQueryData<{
        data: { id: string; status: string; notes?: string | null; updated_at?: string };
      }>(queryKeys.applications.detail(id), (old) =>
        old
          ? {
              ...old,
              data: {
                ...old.data,
                status,
                ...(notes !== undefined ? { notes } : {}),
                updated_at: new Date().toISOString(),
              },
            }
          : old
      );

      return { previousApplications };
    },
    onError: (_error, _variables, context) => {
      context?.previousApplications.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
    },
  });
}

export function useRemoveApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to remove application' }));
        throw new Error(err.error ?? 'Failed to remove application');
      }
      return res.json() as Promise<{ data: { id: string } }>;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.applications.all });
      const previousApplications = queryClient.getQueriesData<unknown>({
        queryKey: queryKeys.applications.all,
      });
      queryClient.setQueriesData<{ data: Array<{ id: string }>; pagination?: { total: number } }>(
        { queryKey: queryKeys.applications.lists() },
        (old) =>
          old
            ? {
                ...old,
                data: old.data.filter((application) => application.id !== id),
                ...(old.pagination
                  ? { pagination: { ...old.pagination, total: Math.max(0, old.pagination.total - 1) } }
                  : {}),
              }
            : old
      );
      return { previousApplications };
    },
    onError: (_error, _id, context) => {
      context?.previousApplications.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
      queryClient.removeQueries({ queryKey: queryKeys.applications.detail(id) });
    },
  });
}

export function useHireApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/applications/${id}/hire`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to hire application' }));
        throw new Error(err.error ?? 'Failed to hire application');
      }
      return res.json() as Promise<{
        data: {
          applicationId: string;
          jobPostingId: string;
          requisitionId: string;
          applicationStatus: 'hired';
          filledHeadcount: number;
          totalHeadcount: number;
          requisitionStatus: 'open' | 'filled';
          postingIsActive: boolean;
          autoClosed: boolean;
        };
      }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
}

export function useBulkImportApplications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobPostingId,
      files,
    }: {
      jobPostingId: string;
      files: File[];
    }) => {
      const formData = new FormData();
      formData.set('job_posting_id', jobPostingId);
      for (const file of files) {
        formData.append('files', file);
      }

      const res = await fetch('/api/applications/bulk-import', {
        method: 'POST',
        body: await stageFormDataFiles(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to import' }));
        throw new Error(err.error ?? 'Failed to import applications');
      }
      return res.json() as Promise<{
        data: {
          imported: Array<{ applicationId: string; fileName: string; status: string }>;
          errors: Array<{ fileName: string; error: string }>;
          summary: { total: number; queued: number; failed: number };
        };
      }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
    },
  });
}

export function useEvaluateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/applications/${id}/evaluate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to evaluate' }));
        throw new Error(err.error ?? 'Failed to evaluate application');
      }
      return res.json() as Promise<{
        data: { status: string; applicationId: string };
      }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.all });
    },
  });
}
