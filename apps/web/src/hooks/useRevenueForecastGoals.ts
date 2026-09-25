'use client';

import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface RevenueForecastGoal {
  id: string;
  year: number;
  goalAmountAud: number;
  label: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface RevenueForecastGoalsResponse {
  data: Array<{
    id: string;
    year: number;
    goal_amount_aud: number;
    label: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }>;
}

interface CreateGoalPayload {
  year: number;
  goalAmountAud: number;
  label?: string | null;
  sortOrder?: number;
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: fallbackMessage }));
    throw new Error(payload.error || fallbackMessage);
  }

  return response.json() as Promise<T>;
}

function mapGoals(payload: RevenueForecastGoalsResponse): Array<RevenueForecastGoal> {
  return payload.data.map((goal) => ({
    id: goal.id,
    year: goal.year,
    goalAmountAud: Number(goal.goal_amount_aud ?? 0),
    label: goal.label,
    sortOrder: goal.sort_order,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
  }));
}

export function useRevenueForecastGoals(year?: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.revenueForecast.goals(year),
    enabled,
    queryFn: async (): Promise<Array<RevenueForecastGoal>> => {
      const params = typeof year === 'number' ? `?year=${year}` : '';
      const response = await fetch(`/api/revenue-forecast/goals${params}`);
      const payload = await readJson<RevenueForecastGoalsResponse>(
        response,
        'Failed to load Revenue Forecast goals'
      );
      return mapGoals(payload);
    },
  });
}

export function useCreateRevenueForecastGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateGoalPayload): Promise<Array<RevenueForecastGoal>> => {
      const response = await fetch('/api/revenue-forecast/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await readJson<RevenueForecastGoalsResponse>(
        response,
        'Failed to create Revenue Forecast goal'
      );
      return mapGoals(data);
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.revenueForecast.goals() });
      const previousGoals = queryClient.getQueriesData<Array<RevenueForecastGoal>>({
        queryKey: queryKeys.revenueForecast.goals(),
      });
      const optimisticGoal: RevenueForecastGoal = {
        id: `optimistic-goal-${crypto.randomUUID()}`,
        year: payload.year,
        goalAmountAud: payload.goalAmountAud,
        label: payload.label ?? null,
        sortOrder: payload.sortOrder ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueriesData<Array<RevenueForecastGoal>>(
        { queryKey: queryKeys.revenueForecast.goals() },
        (old) => (old ? [...old, optimisticGoal] : old)
      );
      return { previousGoals };
    },
    onError: (_error, _payload, context) => {
      context?.previousGoals.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: (_goals, _error, payload) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.revenueForecast.goals(payload.year),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.revenueForecast.goals() });
    },
  });
}

export function useDeleteRevenueForecastGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/revenue-forecast/goals/${id}`, {
        method: 'DELETE',
      });

      await readJson<{ success: boolean }>(response, 'Failed to delete Revenue Forecast goal');
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.revenueForecast.goals() });
      const previousGoals = queryClient.getQueriesData<Array<RevenueForecastGoal>>({
        queryKey: queryKeys.revenueForecast.goals(),
      });
      queryClient.setQueriesData<Array<RevenueForecastGoal>>(
        { queryKey: queryKeys.revenueForecast.goals() },
        (old) => old?.filter((goal) => goal.id !== id)
      );
      return { previousGoals };
    },
    onError: (_error, _id, context) => {
      context?.previousGoals.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.revenueForecast.goals() });
    },
  });
}
