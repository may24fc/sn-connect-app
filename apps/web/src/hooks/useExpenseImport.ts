import { stageFormDataFiles } from '@/lib/storage/stage-form-data';
import { expenseKeys } from '@/hooks/useExpenses';
import { toApiError } from '@/lib/api-error';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface ExpenseImportRowError {
  rowNumber: number;
  message: string;
}

export interface ExpenseImportSummary {
  importedCount: number;
  failedCount: number;
  totalRows: number;
  errors: Array<ExpenseImportRowError>;
}

/**
 * Uploads a CSV/XLSX file to `POST /api/expenses/import`.
 *
 * The route answers 207 when some rows fail, so a successful mutation can still
 * carry row errors — callers must surface `errors`, not just the row count.
 */
export function useImportExpenses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      file: File;
      employeeId?: string | null;
    }): Promise<ExpenseImportSummary> => {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.employeeId) {
        formData.append('employeeId', payload.employeeId);
      }

      const response = await fetch('/api/expenses/import', {
        method: 'POST',
        body: await stageFormDataFiles(formData),
      });

      if (!response.ok && response.status !== 207) {
        throw await toApiError(response, 'Failed to import expenses');
      }

      const body = (await response.json()) as { data: ExpenseImportSummary };
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

/** Downloads the expense import template in the given format. */
export function downloadExpenseImportTemplate(format: 'xlsx' | 'csv'): void {
  window.open(`/api/expenses/template?format=${format}`, '_blank', 'noopener,noreferrer');
}

/**
 * Downloads the consolidated monthly expense report.
 * `month` is `YYYY-MM`; omit it for the current month.
 */
export function downloadMonthlyExpenseReport(format: 'pdf' | 'json', month?: string): void {
  const params = new URLSearchParams({ format });
  if (month) {
    params.set('month', month);
  }
  window.open(
    `/api/expenses/reports/monthly?${params.toString()}`,
    '_blank',
    'noopener,noreferrer'
  );
}
