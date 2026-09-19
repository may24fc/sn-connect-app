'use client';

import { type InternshipDetailRecord, useUpdateInternship } from '@/hooks/useInternships';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useToast,
} from '@hr-portal/ui';
import { Loader2 } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';

/**
 * Text fields on the form, mapped to the payload keys accepted by
 * `updateInternshipSchema`. Nullable columns send `null` when cleared.
 */
const TEXT_FIELDS: ReadonlyArray<{
  field: 'startDate' | 'endDate' | 'department' | 'school' | 'program';
  apiKey: string;
  toPayload: (value: string) => string | null;
}> = [
  { field: 'startDate', apiKey: 'startDate', toPayload: (value) => value },
  { field: 'endDate', apiKey: 'endDate', toPayload: (value) => value },
  { field: 'department', apiKey: 'department', toPayload: (value) => value },
  { field: 'school', apiKey: 'school', toPayload: (value) => value || null },
  { field: 'program', apiKey: 'program', toPayload: (value) => value || null },
];

/** Returns the first validation problem with the pending edit, if any. */
function validateForm(form: FormState, updates: Record<string, unknown>): string | null {
  if (Object.keys(updates).length === 0) {
    return 'Change at least one field before saving.';
  }

  if (!form.department.trim()) {
    return 'Department is required.';
  }

  const datesChanged = 'startDate' in updates || 'endDate' in updates;
  if (datesChanged && form.startDate && form.endDate && form.endDate < form.startDate) {
    return 'The end date must be on or after the start date.';
  }

  return null;
}

interface EditInternshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  internshipId: string;
  associate: InternshipDetailRecord;
}

interface FormState {
  startDate: string;
  endDate: string;
  requiredHours: string;
  department: string;
  school: string;
  program: string;
}

function toFormState(associate: InternshipDetailRecord): FormState {
  return {
    startDate: associate.startDate?.slice(0, 10) ?? '',
    endDate: associate.endDate?.slice(0, 10) ?? '',
    requiredHours: String(associate.requiredHours ?? ''),
    department: associate.department ?? '',
    school: associate.school ?? '',
    program: associate.program ?? '',
  };
}

/**
 * Edits the internship record behind an associate profile via
 * `PATCH /api/internships/[id]`. Only fields accepted by
 * `updateInternshipSchema` are sent, and only changed fields are included so
 * the API's "at least one field" rule stays meaningful.
 */
export function EditInternshipDialog({
  open,
  onOpenChange,
  internshipId,
  associate,
}: EditInternshipDialogProps): ReactNode {
  const { addToast } = useToast();
  const updateInternship = useUpdateInternship();
  const [form, setForm] = useState<FormState>(() => toFormState(associate));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(toFormState(associate));
      setValidationError(null);
    }
  }, [open, associate]);

  const setField = (field: keyof FormState, value: string): void => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  /**
   * Collects the fields the user actually changed. Returns an error message
   * instead of updates when a changed value is not acceptable to the API.
   */
  const buildUpdates = (): { updates: Record<string, unknown> } | { error: string } => {
    const initial = toFormState(associate);
    const updates: Record<string, unknown> = {};

    for (const { field, apiKey, toPayload } of TEXT_FIELDS) {
      const current = form[field].trim();
      if (current !== initial[field].trim()) {
        updates[apiKey] = toPayload(current);
      }
    }

    if (form.requiredHours !== initial.requiredHours) {
      const parsedHours = Number(form.requiredHours);
      if (!Number.isInteger(parsedHours) || parsedHours < 1 || parsedHours > 20000) {
        return { error: 'Required hours must be a whole number between 1 and 20000.' };
      }
      updates.requiredHours = parsedHours;
    }

    const validationMessage = validateForm(form, updates);
    if (validationMessage) {
      return { error: validationMessage };
    }

    return { updates };
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setValidationError(null);

    const result = buildUpdates();

    if ('error' in result) {
      setValidationError(result.error);
      return;
    }

    const { updates } = result;

    try {
      await updateInternship.mutateAsync({ internshipId, updates });
      addToast({ title: 'Associate profile updated', variant: 'success' });
      onOpenChange(false);
    } catch (updateError) {
      addToast({
        title: 'Failed to update profile',
        description:
          updateError instanceof Error
            ? updateError.message
            : 'The internship record could not be updated.',
        variant: 'error',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>Edit Associate Profile</DialogTitle>
            <DialogDescription>
              Update the internship record for {associate.name}. Contact details are managed from
              the employee record.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="internship-start-date">Start Date</Label>
              <Input
                id="internship-start-date"
                type="date"
                value={form.startDate}
                onChange={(event) => setField('startDate', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internship-end-date">End Date</Label>
              <Input
                id="internship-end-date"
                type="date"
                value={form.endDate}
                onChange={(event) => setField('endDate', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internship-required-hours">Required Hours</Label>
              <Input
                id="internship-required-hours"
                type="number"
                min={1}
                max={20000}
                value={form.requiredHours}
                onChange={(event) => setField('requiredHours', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internship-department">Department</Label>
              <Input
                id="internship-department"
                value={form.department}
                onChange={(event) => setField('department', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internship-school">School</Label>
              <Input
                id="internship-school"
                value={form.school}
                onChange={(event) => setField('school', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internship-program">Program</Label>
              <Input
                id="internship-program"
                value={form.program}
                onChange={(event) => setField('program', event.target.value)}
              />
            </div>
          </div>

          {validationError && (
            <p className="pb-2 text-sm text-rose-600 dark:text-rose-400">{validationError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateInternship.isPending}>
              {updateInternship.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
