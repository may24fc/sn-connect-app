import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AiExpenseCreateInput,
  AiExpenseUpdateInput,
  AiProviderCreateInput,
  AiProviderDeleteInput,
  AiProviderUpdateInput,
  AiSpendType,
} from '@/lib/schemas/ai-expense.schema';

export interface AiExpenseProvider {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface AiExpense {
  id: string;
  user_id: string;
  provider_id: string;
  spend_type: AiSpendType;
  transaction_date: string;
  amount_cents: number;
  currency: string;
  account_email: string;
  transaction_id: string;
  reason: string;
  created_at: string;
  updated_at: string;
  provider?: {
    id: string;
    name: string;
  };
}

export const aiExpenseKeys = {
  all: ['ai-expenses'] as const,
  providers: () => [...aiExpenseKeys.all, 'providers'] as const,
  list: (filters: { providerId?: string; dateFrom?: string; dateTo?: string } = {}) =>
    [...aiExpenseKeys.all, 'list', filters] as const,
};

export function useAiExpenseProviders() {
  return useQuery({
    queryKey: aiExpenseKeys.providers(),
    queryFn: async (): Promise<{ providers: AiExpenseProvider[] }> => {
      const response = await fetch('/api/ai-expenses/categories');
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to fetch AI providers');
      }

      const payload = await response.json();
      return {
        providers: payload.providers ?? payload.categories ?? [],
      };
    },
  });
}

export function useAiExpenses(filters: { providerId?: string; dateFrom?: string; dateTo?: string } = {}) {
  return useQuery({
    queryKey: aiExpenseKeys.list(filters),
    queryFn: async (): Promise<{ data: AiExpense[] }> => {
      const params = new URLSearchParams();
      if (filters.providerId) params.set('providerId', filters.providerId);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const response = await fetch(`/api/ai-expenses${params.size > 0 ? `?${params.toString()}` : ''}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to fetch your AI expenses');
      }

      return response.json();
    },
  });
}

export function useCreateAiExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AiExpenseCreateInput): Promise<{ data: AiExpense }> => {
      const response = await fetch('/api/ai-expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payloadError = await response.json().catch(() => null);
        throw new Error(payloadError?.error || 'Failed to add AI expense');
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiExpenseKeys.all });
    },
  });
}

export function useUpdateAiExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: AiExpenseUpdateInput }): Promise<{ data: AiExpense }> => {
      const response = await fetch(`/api/ai-expenses/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payloadError = await response.json().catch(() => null);
        throw new Error(payloadError?.error || 'Failed to update AI expense');
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiExpenseKeys.all });
    },
  });
}

export function useDeleteAiExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const response = await fetch(`/api/ai-expenses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payloadError = await response.json().catch(() => null);
        throw new Error(payloadError?.error || 'Failed to delete AI expense');
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiExpenseKeys.all });
    },
  });
}

export function useCreateAiExpenseProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AiProviderCreateInput): Promise<{ data: AiExpenseProvider }> => {
      const response = await fetch('/api/ai-expenses/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payloadError = await response.json().catch(() => null);
        throw new Error(payloadError?.error || 'Failed to add provider');
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiExpenseKeys.providers() });
    },
  });
}

export function useUpdateAiExpenseProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AiProviderUpdateInput): Promise<{ data: AiExpenseProvider }> => {
      const response = await fetch('/api/ai-expenses/categories', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payloadError = await response.json().catch(() => null);
        throw new Error(payloadError?.error || 'Failed to update provider');
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiExpenseKeys.providers() });
    },
  });
}

export function useDeleteAiExpenseProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AiProviderDeleteInput): Promise<{ success: boolean }> => {
      const response = await fetch('/api/ai-expenses/categories', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payloadError = await response.json().catch(() => null);
        throw new Error(payloadError?.error || 'Failed to delete provider');
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiExpenseKeys.providers() });
      void queryClient.invalidateQueries({ queryKey: aiExpenseKeys.list() });
    },
  });
}
