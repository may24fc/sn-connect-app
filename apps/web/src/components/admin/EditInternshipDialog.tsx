'use client';

import { PersonSearchSelect } from '@/components/people/PersonSearchSelect';
import { useDepartments } from '@/hooks/useDepartments';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@hr-portal/ui';
import { Loader2 } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';

/**
 * Text fields on the form, mapped to the payload keys accepted by
 * `updateInternshipSchema`. Nullable columns send `null` when cleared.
 */
const TEXT_FIELDS: ReadonlyArray<{
  field: 'startDate' | 'endDate' | 'school' | 'program';
  apiKey: string;
  toPayload: (value: string) => string | null;
}> = [
  { field: 'startDate', apiKey: 'startDate', toPayload: (value) => value },
  { field: 'endDate', apiKey: 'endDate', toPayload: (value) => value },
  { field: 'school', apiKey: 'school', toPayload: (value) => value || null },
  { field: 'program', apiKey: 'program', toPayload: (value) => value || null },
];

/** Returns the first validation problem with the pending edit, if any. */
function validateForm(form: FormState, updates: Record<string, unknown>): string | null {
  if (Object.keys(updates).length === 0) {
    return 'Change at least one field before saving.';
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
  school: string;
  program: string;
}

function toFormState(associate: InternshipDetailRecord): FormState {
  return {
    startDate: associate.startDate?.slice(0, 10) ?? '',
    endDate: associate.endDate?.slice(0, 10) ?? '',
    requiredHours: String(associate.requiredHours ?? ''),
    school: associate.school ?? '',
    program: associate.program ?? '',
  };
}

/**
 * Edits the internship record behind an associate profile via
 * `PATCH /api/internships/[id]`. Only fields accepted by
 * `updateInternshipSchema` are sent, and only changed fields are included so
 * the API's "at least one field" rule stays meaningful. Department and supervisor
 * are picked from real records so they stay linked to the directory.
 */
export function EditInternshipDialog({
  open,
  onOpenChange,
  internshipId,
  associate,
}: EditInternshipDialogProps): ReactNode {
  const { addToast } = useToast();
  const updateInternship = useUpdateInternship();
  const departmentsQuery = useDepartments({ page: 1, pageSize: 200 });
  const [form, setForm] = useState<FormState>(() => toFormState(associate));
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [supervisorId, setSupervisorId] = useState<string | null>(associate.supervisorId);
  const [validationError, setValidationError] = useState<string | null>(null);

  const departments = departmentsQuery.data?.data ?? [];
  const currentDepartmentId = useMemo(
    () =>
      departments.find(
        (department) =>
          department.name.trim().toLowerCase() === (associate.department ?? '').trim().toLowerCase()
      )?.id ?? null,
    [departments, associate.department]
  );
  const selectedDepartmentId = departmentId ?? currentDepartmentId;

  useEffect(() => {
    if (open) {
      setForm(toFormState(associate));
      setDepartmentId(null);
      setSupervisorId(associate.supervisorId);
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

    if (departmentId && departmentId !== currentDepartmentId) {
      updates.departmentId = departmentId;
    }

    if (supervisorId !== associate.supervisorId) {
      updates.supervisorId = supervisorId;
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
      <DialogContent className="max-h-[calc(100vh-2rem)] max-w-lg overflow-y-auto">
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
              <Select
                value={selectedDepartmentId ?? ''}
                onValueChange={setDepartmentId}
                disabled={departmentsQuery.isLoading}
              >
                <SelectTrigger id="internship-department">
                  <SelectValue
                    placeholder={
                      associate.department
                        ? `${associate.department} (not in department list)`
                        : 'Select department'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="internship-school">School</Label>
              <Input
                id="internship-school"
                maxLength={200}
                value={form.school}
                onChange={(event) => setField('school', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internship-program">Program</Label>
              <Input
                id="internship-program"
                maxLength={200}
                value={form.program}
                onChange={(event) => setField('program', event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="internship-supervisor-search">Supervisor</Label>
              <PersonSearchSelect
                id="internship-supervisor-search"
                value={supervisorId}
                onChange={setSupervisorId}
                excludeUserIds={[associate.userId]}
                roles={['employee']}
                disabled={updateInternship.isPending}
              />
              <p className="text-xs text-muted-foreground">
                The supervisor can view this internship and review its daily logs.
              </p>
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
