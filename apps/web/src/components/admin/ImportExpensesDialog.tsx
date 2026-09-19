'use client';

import {
  type ExpenseImportSummary,
  downloadExpenseImportTemplate,
  useImportExpenses,
} from '@/hooks/useExpenseImport';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, CheckCircle2, Download, Loader2, Upload, X } from 'lucide-react';
import { type ChangeEvent, type ReactNode, useState } from 'react';

const ACCEPTED_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
].join(',');

interface ImportExpensesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportExpensesDialog({ open, onOpenChange }: ImportExpensesDialogProps): ReactNode {
  const { addToast } = useToast();
  const importExpenses = useImportExpenses();
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ExpenseImportSummary | null>(null);

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setFile(null);
      setSummary(null);
      importExpenses.reset();
    }
    onOpenChange(nextOpen);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setSummary(null);
    setFile(event.target.files?.[0] ?? null);
  };

  const handleImport = async (): Promise<void> => {
    if (!file) return;

    try {
      const result = await importExpenses.mutateAsync({ file });
      setSummary(result);

      addToast({
        title: result.failedCount === 0 ? 'Import complete' : 'Import finished with row errors',
        description: `${result.importedCount} of ${result.totalRows} row${
          result.totalRows === 1 ? '' : 's'
        } imported${result.failedCount > 0 ? `, ${result.failedCount} failed` : ''}.`,
        variant: result.failedCount === 0 ? 'success' : 'error',
      });
    } catch (importError) {
      addToast({
        title: 'Import failed',
        description:
          importError instanceof Error ? importError.message : 'The file could not be imported.',
        variant: 'error',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Expenses</DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX file of expense entries. Imported rows land in the associate review
            queue, not directly in the approved ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadExpenseImportTemplate('xlsx')}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Template (XLSX)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadExpenseImportTemplate('csv')}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Template (CSV)
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-import-file">Import file</Label>
            <input
              id="expense-import-file"
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              disabled={importExpenses.isPending}
              className="block w-full cursor-pointer rounded-md border border-zinc-200 bg-white p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:file:bg-zinc-800"
            />
            <p className="text-xs text-muted-foreground">
              Maximum file size 10MB. Use the template above so column headers match.
            </p>
          </div>

          {summary && (
            <div className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm">
                {summary.failedCount === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                <span>
                  {summary.importedCount} imported, {summary.failedCount} failed of{' '}
                  {summary.totalRows} row{summary.totalRows === 1 ? '' : 's'}.
                </span>
              </div>

              {summary.errors.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {summary.errors.map((rowError) => (
                    <p
                      key={`${rowError.rowNumber}-${rowError.message}`}
                      className="text-xs text-rose-600 dark:text-rose-400"
                    >
                      Row {rowError.rowNumber}: {rowError.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            <X className="mr-1.5 h-4 w-4" />
            {summary ? 'Close' : 'Cancel'}
          </Button>
          <Button onClick={() => void handleImport()} disabled={!file || importExpenses.isPending}>
            {importExpenses.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
