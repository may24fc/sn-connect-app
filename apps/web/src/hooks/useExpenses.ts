import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExpenseVerifyInput } from '@/lib/schemas/expense.schema';

export interface ExpenseEntry {
  id: string;
  created_at: string;
  submitted_by: string;
  receipt_path: string | null;
  vendor_name: string;
  transaction_date: string;
  tax_amount: number | null;
  total_amount: number;
  currency: string;
  draft_debit_account: string | null;
  draft_credit_account: string | null;
  verified_debit_account: string | null;
  verified_credit_account: string | null;
  business_justification: string | null;
  reviewer_notes: string | null;
  risk_bucket: 'standard_recurring' | 'price_spike' | 'non_recurring' | null;
  processing_status:
    | 'awaiting_intern_review'
    | 'auto_approved'
    | 'leadership_review_required'
    | 'approved'
    | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_by_user?: {
    display_name: string | null;
    email: string;
  };
}

export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (filters: { status?: string; userId?: string }) => [...expenseKeys.lists(), filters] as const,
  details: () => [...expenseKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseKeys.details(), id] as const,
};

/**
 * Hook to retrieve a list of expenses with optional filtering
 */
export function useExpenses(filters: { status?: string; userId?: string | null | undefined } = {}) {
  // Allow safe optional assignment or fallback to undefined if exactOptionalPropertyTypes is strict
  const finalFilters: { status?: string; userId?: string } = {};
  if (filters.status !== undefined) finalFilters.status = filters.status;
  if (filters.userId !== undefined && filters.userId !== null) finalFilters.userId = filters.userId;

  return useQuery({
    queryKey: expenseKeys.list(finalFilters),
    queryFn: async (): Promise<{ data: ExpenseEntry[] }> => {
      const params = new URLSearchParams();
      if (finalFilters.status) params.append('status', finalFilters.status);
      if (finalFilters.userId) params.append('userId', finalFilters.userId);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch expenses');
      }
      return res.json();
    },
  });
}

/**
 * Hook to upload a receipt file and create a draft expense entry with OCR extraction
 */
export function useUploadAndExtractExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { file: File; businessJustification?: string }): Promise<{ data: { expenseEntry: ExpenseEntry } }> => {
      const formData = new FormData();
      formData.append('file', params.file);
      if (params.businessJustification) {
        formData.append('businessJustification', params.businessJustification);
      }

      const res = await fetch('/api/expenses/extract', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Failed to upload and extract receipt');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

/**
 * Hook for Accounting department reviewers to verify and submit manual overrides for an expense entry
 */
export function useVerifyExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; verification: ExpenseVerifyInput }) => {
      const res = await fetch(`/api/expenses/${params.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params.verification),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Failed to verify expense');
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(variables.id) });
    },
  });
}

/**
 * Hook for Executive Leadership to approve or reject exception buckets (yellow/red flags)
 */
export function useLeadershipDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; action: 'approve' | 'reject'; notes?: string | null }) => {
      const res = await fetch(`/api/expenses/${params.id}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: params.action, notes: params.notes }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Failed to submit exception decision');
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(variables.id) });
    },
  });
}
