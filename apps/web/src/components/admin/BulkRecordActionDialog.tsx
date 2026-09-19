'use client';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  useToast,
} from '@hr-portal/ui';
import { AlertCircle, CheckCircle2, Inbox, Loader2, X } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

export interface BulkActionItem {
  id: string;
  label: string;
  /** Short qualifier shown on the right of the row, e.g. a status. */
  hint?: string;
}

interface BulkActionOutcome extends BulkActionItem {
  success: boolean;
  error?: string;
}

interface BulkRecordActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Selectable records; pass an already-filtered list (e.g. excluding archived rows). */
  items: Array<BulkActionItem>;
  emptyTitle?: string;
  emptyDescription?: string;
  actionLabel: string;
  actionIcon?: ReactNode;
  destructive?: boolean;
  /** Applies the action to one record. Reject to mark that record as failed. */
  perform: (item: BulkActionItem) => Promise<void>;
  /** Called once after every record has been attempted, for cache invalidation. */
  onCompleted?: () => void;
}

/**
 * Runs a per-record action over a selected subset and reports the outcome for
 * each one. There is no transactional bulk endpoint behind these flows, so
 * records are processed sequentially and a partial failure leaves the
 * successful records changed — the result list makes that explicit.
 */
export function BulkRecordActionDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
  emptyTitle = 'Nothing to select',
  emptyDescription = 'There are no records available for this action.',
  actionLabel,
  actionIcon,
  destructive = false,
  perform,
  onCompleted,
}: BulkRecordActionDialogProps): ReactNode {
  const { addToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Array<string>>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Array<BulkActionOutcome> | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.label.toLowerCase().includes(term));
  }, [items, search]);

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setSelectedIds([]);
      setSearch('');
      setResults(null);
    }
    onOpenChange(nextOpen);
  };

  const toggle = (id: string): void => {
    setResults(null);
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  };

  const toggleAllVisible = (): void => {
    setResults(null);
    const visibleIds = visible.map((item) => item.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  };

  /** Runs `perform` over each record in order and records success or failure. */
  const runSequentially = async (
    selected: Array<BulkActionItem>
  ): Promise<Array<BulkActionOutcome>> => {
    const outcomes: Array<BulkActionOutcome> = [];

    for (const item of selected) {
      try {
        await perform(item);
        outcomes.push({ ...item, success: true });
      } catch (actionError) {
        outcomes.push({
          ...item,
          success: false,
          error: actionError instanceof Error ? actionError.message : 'The action failed',
        });
      }
    }

    return outcomes;
  };

  const handleRun = async (): Promise<void> => {
    const selected = items.filter((item) => selectedIds.includes(item.id));
    if (selected.length === 0) return;

    setIsRunning(true);
    const outcomes = await runSequentially(selected);
    setIsRunning(false);

    setResults(outcomes);
    // Keep only the failures selected so a retry does not repeat successful work.
    setSelectedIds(outcomes.filter((outcome) => !outcome.success).map((outcome) => outcome.id));
    onCompleted?.();

    const failed = outcomes.filter((outcome) => !outcome.success).length;
    const succeeded = outcomes.length - failed;
    addToast({
      title: failed === 0 ? `${actionLabel} complete` : 'Some records could not be processed',
      description:
        failed === 0
          ? `${succeeded} of ${outcomes.length} succeeded.`
          : `${succeeded} of ${outcomes.length} succeeded, ${failed} failed.`,
      variant: failed === 0 ? 'success' : 'error',
    });
  };

  const allVisibleSelected =
    visible.length > 0 && visible.every((item) => selectedIds.includes(item.id));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {items.length === 0 ? (
            <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} size="sm" />
          ) : (
            <>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter by name..."
                disabled={isRunning}
              />

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllVisible}
                  disabled={isRunning || visible.length === 0}
                >
                  {allVisibleSelected ? 'Clear selection' : 'Select all shown'}
                </Button>
                <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
              </div>

              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
                {visible.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">No records match that filter.</p>
                ) : (
                  visible.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded p-1.5">
                      <Checkbox
                        id={`bulk-action-${item.id}`}
                        checked={selectedIds.includes(item.id)}
                        disabled={isRunning}
                        onCheckedChange={() => toggle(item.id)}
                      />
                      <Label
                        htmlFor={`bulk-action-${item.id}`}
                        className="min-w-0 flex-1 cursor-pointer truncate font-normal"
                      >
                        {item.label}
                      </Label>
                      {item.hint && (
                        <span className="flex-shrink-0 text-xs capitalize text-muted-foreground">
                          {item.hint}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {results && (
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
              {results.map((result) => (
                <div key={result.id} className="flex items-start gap-2 text-sm">
                  {result.success ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-600" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate">{result.label}</p>
                    {!result.success && (
                      <p className="text-xs text-rose-600 dark:text-rose-400">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            <X className="mr-1.5 h-4 w-4" />
            {results ? 'Close' : 'Cancel'}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={() => void handleRun()}
            disabled={isRunning || selectedIds.length === 0}
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Working...
              </>
            ) : (
              <>
                {actionIcon}
                {actionLabel} {selectedIds.length > 0 ? selectedIds.length : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
