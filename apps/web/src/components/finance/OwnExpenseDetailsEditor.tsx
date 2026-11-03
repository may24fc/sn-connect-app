'use client';

import { type ExpenseEntry, useUpdateOwnExpenseDetails } from '@/hooks/useExpenses';
import { FINANCE_CATEGORIES } from '@/lib/finance/categories';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { Pencil } from 'lucide-react';
import { useId, useState } from 'react';

const EDITABLE_STATUSES = new Set(['draft_extracted', 'awaiting_associate_review']);

export function canEditOwnExpense(expense: ExpenseEntry, userId: string | undefined): boolean {
  return (
    expense.submitted_by === userId &&
    EDITABLE_STATUSES.has(expense.processing_status) &&
    expense.match_status === 'unmatched' &&
    expense.approval_state !== 'approved' &&
    expense.approval_state !== 'rejected'
  );
}

export function OwnExpenseDetailsEditor({ expense }: { expense: ExpenseEntry }) {
  const { addToast } = useToast();
  const fieldId = useId();
  const mutation = useUpdateOwnExpenseDetails();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>(
    expense.category_code ?? expense.expense_type ?? 'other'
  );
  const [source, setSource] = useState<string>(expense.payment_source ?? 'unknown');
  const [purpose, setPurpose] = useState(expense.business_justification ?? '');
  const [error, setError] = useState('');

  function openEditor() {
    setCategory(expense.category_code ?? expense.expense_type ?? 'other');
    setSource(expense.payment_source ?? 'unknown');
    setPurpose(expense.business_justification ?? '');
    setError('');
    setOpen(true);
  }

  function save() {
    if (!purpose.trim()) {
      setError('Business purpose is required.');
      return;
    }
    mutation.mutate(
      {
        id: expense.id,
        categoryCode: category,
        paymentSource: source,
        businessJustification: purpose.trim(),
      },
      {
        onSuccess: () => {
          setOpen(false);
          addToast({
            title: 'Expense updated',
            description: `${expense.vendor_name} details were saved.`,
            variant: 'success',
          });
        },
        onError: (cause) => setError(cause instanceof Error ? cause.message : 'Could not save'),
      }
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={openEditor}
        title="Edit details"
        aria-label={`Edit details for ${expense.vendor_name}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={(next) => (mutation.isPending ? undefined : setOpen(next))}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {expense.vendor_name}</DialogTitle>
            <DialogDescription>
              Correct the details read from your receipt. You can edit until Finance reviews or
              matches it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor={`${fieldId}-category`}>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id={`${fieldId}-category`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCE_CATEGORIES.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${fieldId}-source`}>Paid with</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id={`${fieldId}-source`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">To confirm</SelectItem>
                  <SelectItem value="personal_card">Personal card</SelectItem>
                  <SelectItem value="company_card">Company card</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${fieldId}-purpose`}>Business purpose</Label>
              <Textarea
                id={`${fieldId}-purpose`}
                required
                maxLength={2000}
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                className="min-h-[72px]"
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={mutation.isPending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={mutation.isPending} onClick={save}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
