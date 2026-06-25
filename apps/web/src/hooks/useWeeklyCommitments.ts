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
    iso_week: raw.iso_week,
    iso_year: raw.iso_year,
    locked_at: raw.locked_at ?? null,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    items,
  };
}

export function useMyWeeklyCommitment(options?: { enabled?: boolean }) {
  return useQuery<WeeklyCommitment | null>({
    queryKey: ['weekly-commitment', 'me'],
    queryFn: async () => {
      const res = await fetch('/api/weekly-commitments');
      if (res.status === 403) throw new Error('Forbidden');
      if (!res.ok) {
        return null;
      }
      const body = await res.json();
      return normalizeCommitment(body?.data ?? null);
    },
    staleTime: 1000 * 60 * 2,
    ...options,
  });
}

export function useWeeklyCommitment(userId?: string | null, options?: { enabled?: boolean }) {
  return useQuery<WeeklyCommitment | null>({
    queryKey: ['weekly-commitment', userId ?? 'me'],
    queryFn: async () => {
      const url = userId ? `/api/weekly-commitments?userId=${encodeURIComponent(userId)}` : '/api/weekly-commitments';
      const res = await fetch(url);
      if (res.status === 403) throw new Error('Forbidden');
      if (!res.ok) return null;
      const body = await res.json();
      return normalizeCommitment(body?.data ?? null);
    },
    staleTime: 1000 * 60 * 2,
    ...options,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weekly-commitment'] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weekly-commitment'] }),
  });
}
