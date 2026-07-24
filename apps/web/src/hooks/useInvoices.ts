import { type InvoiceFilters, queryKeys } from '@/lib/query-keys';
import type {
  InvoiceApprovalInput,
  InvoiceCreateInput,
  InvoiceUpdateInput,
} from '@/lib/schemas/invoice.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface UseInvoicesOptions {
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
}

type ExchangeRateToAudResponse = {
  data: {
    sourceCurrency: string;
    exchangeRateToAud: number;
    fxRatesFetchedAt: string | null;
    fxSource: 'cached_fx_rates' | 'base_currency' | 'wise_public';
    resolvedFrom: 'cache' | 'base_currency' | 'wise_public';
  };
};

export interface InvoiceRecord {
  id: string;
  employee_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  hourly_rate: number | null;
  hours_worked: number | null;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  source_currency: string | null;
  target_currency: string | null;
  exchange_rate: number | null;
  converted_amount: number | null;
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  document_id: string | null;
  created_at: string;
  updated_at: string;
  employees?: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    department: string;
  };
  invoice_line_items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

interface InvoiceListResponse {
  data: Array<InvoiceRecord>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ApproveInvoiceResponse {
  data: InvoiceRecord;
  payroll?: {
    triggered: boolean;
    success: boolean;
    paymentId?: string;
    wiseTransferId?: number;
    error?: string;
  };
}

export function useInvoices(filters: InvoiceFilters = {}, options: UseInvoicesOptions = {}) {
  return useQuery({
    queryKey: queryKeys.payroll.list(filters),
    queryFn: async (): Promise<InvoiceListResponse> => {
      const params = new URLSearchParams();

      if (filters.status) params.append('status', filters.status);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.selfOnly) params.append('selfOnly', 'true');
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

      const response = await fetch(`/api/invoices?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      return response.json();
    },
    ...(options.refetchInterval !== undefined
      ? { refetchInterval: options.refetchInterval }
      : {}),
    ...(options.refetchOnWindowFocus !== undefined
      ? { refetchOnWindowFocus: options.refetchOnWindowFocus }
      : {}),
  });
}

export function useInvoice(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.payroll.detail(id || ''),
    queryFn: async (): Promise<{ data: InvoiceRecord }> => {
      if (!id) throw new Error('Invoice ID is required');

      const response = await fetch(`/api/invoices/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }

      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InvoiceCreateInput): Promise<{ data: InvoiceRecord }> => {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create invoice');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payroll.all });
    },
  });
}

export function useUpdateInvoice(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InvoiceUpdateInput): Promise<{ data: InvoiceRecord }> => {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update invoice');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payroll.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payroll.detail(id) });
    },
  });
}

export function useSubmitInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ data: InvoiceRecord }> => {
      const response = await fetch(`/api/invoices/${id}/submit`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit invoice');
      }

      return response.json();
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payroll.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payroll.detail(id) });
    },
  });
}

export function useApproveInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: InvoiceApprovalInput;
    }): Promise<ApproveInvoiceResponse> => {
      const response = await fetch(`/api/invoices/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update approval status');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payroll.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payroll.detail(variables.id) });
    },
  });
}

export function useInvoiceExchangeRateToAud(sourceCurrency: string, enabled = true) {
  const normalizedCurrency = sourceCurrency.trim().toUpperCase();

  return useQuery({
    queryKey: queryKeys.payroll.fxRateToAud(normalizedCurrency || 'AUD'),
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
