import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type MilestoneItem = {
  id: string;
  milestone_id: string | null;
  title?: string | null;
  project_name?: string | null;
  status?: string | null;
  progress_pct?: number | null;
  slot_order?: number | null;
};

export type WeeklyCommitment = {
  id: string;
  user_id: string;
  project_id?: string | null;
  project_name?: string | null;
  iso_week: number;
  iso_year: number;
  locked_at?: string | null;
  created_at: string;
  updated_at: string;
  items: MilestoneItem[];
};

function normalizeCommitment(raw: any): WeeklyCommitment | null {
  if (!raw) return null;
  const items: MilestoneItem[] = (raw.items ?? []).map((it: any) => ({
    id: it.id,
    slot_order: it.slot_order ?? null,
    milestone_id: it.milestone?.id ?? null,
    title: it.milestone?.title ?? null,
    project_name: it.milestone?.project_name ?? null,
    status: it.milestone?.status ?? null,
    progress_pct: typeof it.milestone?.progress_pct === 'number' ? it.milestone.progress_pct : (it.progress_pct ?? null),
  }));

  return {
    id: raw.id,
    user_id: raw.user_id,
    project_id: raw.project_id ?? null,
    project_name: raw.project_name ?? null,
    iso_week: raw.iso_week,
    iso_year: raw.iso_year,
    locked_at: raw.locked_at ?? null,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    items,
  };
}

function normalizeCommitments(raw: any): WeeklyCommitment[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => normalizeCommitment(entry))
      .filter((entry): entry is WeeklyCommitment => entry !== null);
  }

  const single = normalizeCommitment(raw);
  return single ? [single] : [];
}

function buildQuery(params: Record<string, string | null | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export function useMyWeeklyCommitments(options?: {
  enabled?: boolean;
  projectId?: string | null;
}) {
  const projectId = options?.projectId ?? null;

  return useQuery<WeeklyCommitment[]>({
    queryKey: ['weekly-commitments', 'me', projectId ?? 'all-projects'],
    queryFn: async () => {
      const query = buildQuery({ projectId });
      const res = await fetch(`/api/weekly-commitments${query}`);
      if (res.status === 403) throw new Error('Forbidden');
      if (!res.ok) {
        return [];
      }
      const body = await res.json();
      return normalizeCommitments(body?.data ?? null);
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useMyWeeklyCommitment(options?: { enabled?: boolean; projectId?: string | null }) {
  const projectId = options?.projectId ?? null;

  return useQuery<WeeklyCommitment | null>({
    queryKey: ['weekly-commitment', 'me', projectId ?? 'any-project'],
    queryFn: async () => {
      const query = buildQuery({ projectId });
      const res = await fetch(`/api/weekly-commitments${query}`);
      if (res.status === 403) throw new Error('Forbidden');
      if (!res.ok) {
        return null;
      }
      const body = await res.json();
      const commitments = normalizeCommitments(body?.data ?? null);
      return commitments[0] ?? null;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useWeeklyCommitments(
  userId?: string | null,
  options?: { enabled?: boolean; projectId?: string | null }
) {
  const projectId = options?.projectId ?? null;

  return useQuery<WeeklyCommitment[]>({
    queryKey: ['weekly-commitments', userId ?? 'me', projectId ?? 'all-projects'],
    queryFn: async () => {
      const query = buildQuery({ userId: userId ?? null, projectId });
      const res = await fetch(`/api/weekly-commitments${query}`);
      if (res.status === 403) throw new Error('Forbidden');
      if (!res.ok) return [];
      const body = await res.json();
      return normalizeCommitments(body?.data ?? null);
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useWeeklyCommitment(
  userId?: string | null,
  options?: { enabled?: boolean; projectId?: string | null }
) {
  const projectId = options?.projectId ?? null;

  return useQuery<WeeklyCommitment | null>({
    queryKey: ['weekly-commitment', userId ?? 'me', projectId ?? 'any-project'],
    queryFn: async () => {
      const query = buildQuery({ userId: userId ?? null, projectId });
      const res = await fetch(`/api/weekly-commitments${query}`);
      if (res.status === 403) throw new Error('Forbidden');
      if (!res.ok) return null;
      const body = await res.json();
      const commitments = normalizeCommitments(body?.data ?? null);
      return commitments[0] ?? null;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateCommitment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { iso_week: number; iso_year: number; items: { milestone_id: string; slot_order: number }[] }) => {
      const res = await fetch('/api/weekly-commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create weekly commitment');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-commitment'] });
      qc.invalidateQueries({ queryKey: ['weekly-commitments'] });
    },
  });
}

export function useLockCommitment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`/api/weekly-commitments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lock: true }),
      });
      if (!res.ok) throw new Error('Failed to lock commitment');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-commitment'] });
      qc.invalidateQueries({ queryKey: ['weekly-commitments'] });
    },
  });
}
