import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExpenseLogRequestInput, ExpenseMatchInput, ExpenseVerifyInput } from '@/lib/schemas/expense.schema';

export interface ExpenseEntry {
  id: string;
  created_at: string;
  submitted_by: string;
  receipt_path: string | null;
  receipt_preview_url?: string | null;
  receipt_mime_type?: string | null;
  department_id: string | null;
  expense_type:
    | 'office_supplies'
    | 'travel'
    | 'meals'
    | 'software'
    | 'equipment'
    | 'utilities'
    | 'maintenance'
    | 'other';
  vendor_name: string;
  transaction_date: string;
  tax_amount: number | null;
  total_amount: number;
  currency: string;
  exchange_rate_to_aud: number | null;
  total_amount_aud: number | null;
  tax_amount_aud: number | null;
  draft_debit_account?: string | null;
  draft_credit_account?: string | null;
  ai_debit_account?: string | null;
  ai_credit_account?: string | null;
  verified_debit_account: string | null;
  verified_credit_account: string | null;
  business_justification: string | null;
  reviewer_notes: string | null;
  risk_bucket: 'standard_recurring' | 'price_spike' | 'non_recurring' | null;
  processing_status:
    | 'draft_extracted'
    | 'awaiting_intern_review'
    | 'auto_approved'
    | 'leadership_review_required'
    | 'approved'
    | 'rejected';
  source_type: 'staff_request' | 'direct_payment';
  match_status: 'unmatched' | 'matched' | 'variance_flagged' | 'resolved';
  matched_entry_id: string | null;
  matched_by: string | null;
  matched_at: string | null;
  matched_variance_amount: number | null;
  matched_notes: string | null;
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
  list: (filters: {
    status?: string;
    userId?: string;
    departmentId?: string;
    expenseType?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sourceType?: string;
    matchStatus?: string;
  }) => [...expenseKeys.lists(), filters] as const,
  details: () => [...expenseKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseKeys.details(), id] as const,
  fxRateToAud: (sourceCurrency: string) => [...expenseKeys.all, 'fx-rate-to-aud', sourceCurrency] as const,
};

type ExchangeRateToAudResponse = {
  data: {
    sourceCurrency: string;
    exchangeRateToAud: number;
    fxRatesFetchedAt: string | null;
    fxSource: 'cached_fx_rates' | 'base_currency';
    resolvedFrom: 'cache' | 'base_currency';
  };
};

/**
 * Hook to retrieve a list of expenses with optional filtering
 */
export function useExpenses(filters: {
  status?: string;
  userId?: string | null | undefined;
  departmentId?: string | null | undefined;
  expenseType?: string | null | undefined;
  search?: string | null | undefined;
  dateFrom?: string | null | undefined;
  dateTo?: string | null | undefined;
  sourceType?: string | null | undefined;
  matchStatus?: string | null | undefined;
} = {}) {
  // Allow safe optional assignment or fallback to undefined if exactOptionalPropertyTypes is strict
  const finalFilters: {
    status?: string;
    userId?: string;
    departmentId?: string;
    expenseType?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sourceType?: string;
    matchStatus?: string;
  } = {};
  if (filters.status !== undefined) finalFilters.status = filters.status;
  if (filters.userId !== undefined && filters.userId !== null) finalFilters.userId = filters.userId;
  if (filters.departmentId !== undefined && filters.departmentId !== null) {
    finalFilters.departmentId = filters.departmentId;
  }
  if (filters.expenseType !== undefined && filters.expenseType !== null) {
    finalFilters.expenseType = filters.expenseType;
  }
  if (filters.search !== undefined && filters.search !== null) {
    finalFilters.search = filters.search;
  }
  if (filters.dateFrom !== undefined && filters.dateFrom !== null) {
    finalFilters.dateFrom = filters.dateFrom;
  }
  if (filters.dateTo !== undefined && filters.dateTo !== null) {
    finalFilters.dateTo = filters.dateTo;
  }
  if (filters.sourceType !== undefined && filters.sourceType !== null) {
    finalFilters.sourceType = filters.sourceType;
  }
  if (filters.matchStatus !== undefined && filters.matchStatus !== null) {
    finalFilters.matchStatus = filters.matchStatus;
  }

  return useQuery({
    queryKey: expenseKeys.list(finalFilters),
    queryFn: async (): Promise<{ data: ExpenseEntry[] }> => {
      const params = new URLSearchParams();
      if (finalFilters.status) params.append('status', finalFilters.status);
      if (finalFilters.userId) params.append('userId', finalFilters.userId);
      if (finalFilters.departmentId) params.append('departmentId', finalFilters.departmentId);
      if (finalFilters.expenseType) params.append('expenseType', finalFilters.expenseType);
      if (finalFilters.search) params.append('search', finalFilters.search);
      if (finalFilters.dateFrom) params.append('dateFrom', finalFilters.dateFrom);
      if (finalFilters.dateTo) params.append('dateTo', finalFilters.dateTo);
      if (finalFilters.sourceType) params.append('sourceType', finalFilters.sourceType);
      if (finalFilters.matchStatus) params.append('matchStatus', finalFilters.matchStatus);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch expenses');
      }
      return res.json();
    },
  });
}

export function useExchangeRateToAud(sourceCurrency: string, enabled = true) {
  const normalizedCurrency = sourceCurrency.trim().toUpperCase();

  return useQuery({
    queryKey: expenseKeys.fxRateToAud(normalizedCurrency || 'AUD'),
    enabled,
    queryFn: async (): Promise<ExchangeRateToAudResponse> => {
      const params = new URLSearchParams({ sourceCurrency: normalizedCurrency || 'AUD' });
      const response = await fetch(`/api/expenses/fx-rate?${params.toString()}`);

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error || 'Failed to fetch exchange rate to AUD');
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 15,
  });
}

/**
 * Hook to upload a receipt file and create a draft expense entry with OCR extraction
 */
export function useUploadAndExtractExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { file: File; businessJustification?: string | undefined }): Promise<{ data: { expenseEntry: ExpenseEntry } }> => {
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

export interface QueuedExpenseUploadResult {
  fileName: string;
  status: 'queued' | 'failed';
  expenseEntryId?: string;
  error?: string;
}

export function useQueueExpenseIngestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      files: File[];
      businessJustification?: string | undefined;
      concurrency?: number | undefined;
    }): Promise<{
      summary: { total: number; queued: number; failed: number };
      results: QueuedExpenseUploadResult[];
    }> => {
      const total = params.files.length;
      const results: QueuedExpenseUploadResult[] = [];

      if (total === 0) {
        return {
          summary: { total: 0, queued: 0, failed: 0 },
          results,
        };
      }

      const workerCount = Math.max(1, Math.min(params.concurrency ?? 3, total));
      let cursor = 0;

      const runWorker = async () => {
        while (cursor < total) {
          const currentIndex = cursor;
          cursor += 1;

          const maybeFile = params.files[currentIndex];
          if (!maybeFile) {
            continue;
          }

          const file: File = maybeFile;
          const formData = new FormData();
          formData.append('file', file);

          if (params.businessJustification?.trim()) {
            formData.append('businessJustification', params.businessJustification.trim());
          }

          try {
            const response = await fetch('/api/expenses/ingest', {
              method: 'POST',
              body: formData,
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
              results.push({
                fileName: file.name,
                status: 'failed',
                error: payload?.error || 'Failed to queue receipt ingestion',
              });
              continue;
            }

            results.push({
              fileName: file.name,
              status: 'queued',
              expenseEntryId: payload?.data?.expenseEntry?.id,
            });
          } catch (error) {
            results.push({
              fileName: file.name,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unexpected upload error',
            });
          }
        }
      };

      await Promise.all(Array.from({ length: workerCount }, runWorker));

      const queued = results.filter((entry) => entry.status === 'queued').length;
      const failed = results.length - queued;

      return {
        summary: {
          total,
          queued,
          failed,
        },
        results,
      };
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
 * Hook for all staff/interns to manually log a spend REQUEST (no receipt required).
 */
export function useLogExpenseRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ExpenseLogRequestInput) => {
      const res = await fetch('/api/expenses/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Failed to log expense request');
      }

      return res.json() as Promise<{ data: { expenseEntry: ExpenseEntry } }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

/**
 * Hook for Accounting/Admin reviewers to reconcile a REQUEST against its
 * counterpart PAYMENT entry in the Matching Queue.
 */
export function useMatchExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; match: ExpenseMatchInput }) => {
      const res = await fetch(`/api/expenses/${params.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params.match),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Failed to reconcile match');
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

/**
 * Hook for deleting expense entries.
 * Endpoint enforces role and processing-state permissions.
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Failed to delete expense entry');
      }

      return res.json() as Promise<{ success: boolean }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}
