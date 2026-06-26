import { STALE_TIMES } from '@/lib/query-client';
import { type ProjectFilters, queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectHealth = 'on_track' | 'at_risk' | 'overdue';
export type MilestonePeriodType = 'month' | 'week';
export type MilestoneStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'overdue';
export type ChecklistItemStatus = 'todo' | 'done';

export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  lead_user_id: string;
  supervisor_id: string | null;
  start_date: string;
  target_end_date: string;
  status: ProjectStatus;
  health: ProjectHealth;
  progress_pct: number;
  points_total: number;
  earned_points?: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProjectContributorRecord {
  user_id: string;
  role: 'lead' | 'contributor';
  joined_at: string;
}

export interface ProjectDocumentationRecord {
  id: string;
  project_id: string;
  submitted_by: string;
  submitted_by_name?: string;
  documentation_type: 'link' | 'file';
  content: string;
  label: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  access_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDocumentationCreateResponse {
  data: ProjectDocumentationRecord;
  resourceFolderId?: string;
}

export interface ProjectDetail extends ProjectRecord {
  contributors: ProjectContributorRecord[];
}

export interface MilestoneRecord {
  id: string;
  project_id: string;
  parent_milestone_id: string | null;
  period_type: MilestonePeriodType;
  title: string;
  description: string | null;
  period_start: string;
  period_end: string;
  due_date: string;
  status: MilestoneStatus;
  progress_pct: number;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ChecklistItemRecord {
  id: string;
  milestone_id: string;
  title: string;
  description: string | null;
  status: ChecklistItemStatus;
  position: number;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectListResponse {
  data: ProjectRecord[];
  pagination: { page: number; pageSize: number; total: number };
}

interface ProjectDocumentationListResponse {
  data: ProjectDocumentationRecord[];
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

// ----------------- Queries -----------------

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.health) params.set('health', filters.health);
      if (filters.leadUserId) params.set('leadUserId', filters.leadUserId);
      if (filters.mineOnly) params.set('mineOnly', 'true');
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
      return jsonFetch<ProjectListResponse>(`/api/projects?${params.toString()}`);
    },
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useProject(projectId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId ?? ''),
    queryFn: () => jsonFetch<{ data: ProjectDetail }>(`/api/projects/${projectId}`),
    enabled: !!projectId,
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useProjectDocumentation(projectId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.documentation(projectId ?? ''),
    queryFn: () =>
      jsonFetch<ProjectDocumentationListResponse>(`/api/projects/${projectId}/documentation`),
    enabled: !!projectId,
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useProjectMilestones(projectId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.milestones(projectId ?? ''),
    queryFn: () =>
      jsonFetch<{ data: MilestoneRecord[] }>(`/api/projects/${projectId}/milestones`),
    enabled: !!projectId,
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useMilestoneChecklist(milestoneId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.checklist(milestoneId ?? ''),
    queryFn: () =>
      jsonFetch<{ data: ChecklistItemRecord[] }>(
        `/api/projects/milestones/${milestoneId}/checklist`
      ),
    enabled: !!milestoneId,
    staleTime: STALE_TIMES.dynamic,
  });
}

// ----------------- Mutations -----------------

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  leadUserId: string;
  supervisorId?: string | null;
  startDate: string;
  targetEndDate: string;
  status?: ProjectStatus;
  pointsTotal?: number;
   progressPct?: number;
  isCompletedAlready?: boolean;
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      jsonFetch<{ data: ProjectRecord }>('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}

export interface UpdateProjectInput {
  projectId: string;
  name?: string;
  description?: string | null;
  leadUserId?: string;
  supervisorId?: string | null;
  startDate?: string;
  targetEndDate?: string;
  status?: ProjectStatus;
  pointsTotal?: number;
  progressPct?: number;
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...input }: UpdateProjectInput) =>
      jsonFetch<{ data: ProjectDetail }>(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(vars.projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string }) =>
      jsonFetch<{ ok: true }>(`/api/projects/${input.projectId}`, { method: 'DELETE' }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(vars.projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}

export function useCreateProjectDocumentation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      documentationType: 'link' | 'file';
      content?: string;
      label?: string | null;
      file?: File;
    }) => {
      if (input.documentationType === 'file') {
        if (!(input.file instanceof File)) {
          throw new Error('File is required for file documentation');
        }

        const formData = new FormData();
        formData.append('file', input.file);
        if (input.label) {
          formData.append('label', input.label);
        }

        return jsonFetch<ProjectDocumentationCreateResponse>(
          `/api/projects/${input.projectId}/documentation`,
          {
            method: 'POST',
            body: formData,
          }
        );
      }

      if (!input.content) {
        throw new Error('Link URL is required');
      }

      return jsonFetch<ProjectDocumentationCreateResponse>(
        `/api/projects/${input.projectId}/documentation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentationType: 'link',
            content: input.content,
            label: input.label,
          }),
        }
      );
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.documentation(vars.projectId),
      });
    },
  });
}

export function useDeleteProjectDocumentation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { projectId: string; documentationId: string }) =>
      jsonFetch<{ success: true }>(
        `/api/projects/${input.projectId}/documentation?documentationId=${input.documentationId}`,
        { method: 'DELETE' }
      ),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.documentation(vars.projectId),
      });
    },
  });
}

export interface CreateMilestoneInput {
  projectId: string;
  parentMilestoneId?: string | null;
  periodType: MilestonePeriodType;
  title: string;
  description?: string | null;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  position?: number;
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMilestoneInput) =>
      jsonFetch<{ data: MilestoneRecord }>(`/api/projects/${input.projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.milestones(vars.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(vars.projectId) });
    },
  });
}

export interface UpdateMilestoneInput {
  milestoneId: string;
  projectId: string;
  title?: string;
  description?: string | null;
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string;
  position?: number;
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, ...input }: UpdateMilestoneInput) =>
      jsonFetch<{ data: MilestoneRecord }>(`/api/projects/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.milestones(vars.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(vars.projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { milestoneId: string; projectId: string }) =>
      jsonFetch<{ ok: true }>(`/api/projects/milestones/${input.milestoneId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.milestones(vars.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(vars.projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}

export interface CreateChecklistItemInput {
  milestoneId: string;
  projectId: string;
  title: string;
  description?: string | null;
  position?: number;
}

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChecklistItemInput) =>
      jsonFetch<{ data: ChecklistItemRecord }>(
        `/api/projects/milestones/${input.milestoneId}/checklist`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      ),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.checklist(vars.milestoneId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.milestones(vars.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(vars.projectId) });
    },
  });
}

export interface UpdateChecklistItemInput {
  itemId: string;
  milestoneId: string;
  projectId: string;
  status?: ChecklistItemStatus;
  title?: string;
  description?: string | null;
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, ...input }: UpdateChecklistItemInput) =>
      jsonFetch<{ data: ChecklistItemRecord }>(`/api/projects/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: input.status,
          title: input.title,
          description: input.description,
        }),
      }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.checklist(vars.milestoneId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.milestones(vars.projectId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(vars.projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { itemId: string; milestoneId: string; projectId: string }) =>
      jsonFetch<{ ok: true }>(`/api/projects/checklist/${input.itemId}`, { method: 'DELETE' }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.checklist(vars.milestoneId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projects.milestones(vars.projectId),
      });
    },
  });
}
