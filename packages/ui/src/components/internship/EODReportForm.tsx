'use client';

import {
  AlertCircle,
  Calendar,
  Clock,
  FileEdit,
  FolderKanban,
  Paperclip,
  Plus,
  Send,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import * as React from 'react';
import { FormErrorMessage } from '../forms/FormErrorMessage';
import { FormGroup } from '../forms/FormGroup';
import { Button } from '../../primitives/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../primitives/card';
import { FileDropZone } from '../../primitives/file-drop-zone';
import { Input } from '../../primitives/input';
import { Label } from '../../primitives/label';
import { Textarea } from '../../primitives/textarea';
import type {
  DailyLogAttachment,
  EODReportFormData,
  ProjectFocusEntry,
} from '../../types/internship.types';
import { cn } from '../../utils/cn';

interface StringListFieldProps {
  entries: string[];
  onChange: (entries: string[]) => void;
  placeholder: string;
  addLabel: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  required?: boolean;
  invalid?: boolean;
  errorMessage?: string;
}

function StringListField({
  entries,
  onChange,
  placeholder,
  addLabel,
  icon,
  title,
  description,
  required = false,
  invalid = false,
  errorMessage,
}: StringListFieldProps): React.ReactNode {
  const normalizedEntries = entries.length > 0 ? entries : [''];

  const updateEntry = (index: number, value: string): void => {
    const next = [...normalizedEntries];
    next[index] = value;
    onChange(next);
  };

  const removeEntry = (index: number): void => {
    onChange(normalizedEntries.filter((_, entryIndex) => entryIndex !== index));
  };

  const addEntry = (): void => {
    onChange([...normalizedEntries, '']);
  };

  return (
    <FormGroup
      label={title}
      required={required}
      showOptional={false}
      description={description || undefined}
      error={errorMessage}
      icon={icon}
      className="space-y-3"
    >
      <div className="space-y-2">
        {normalizedEntries.map((entry, index) => (
          <div key={`${title}-${index}`} className="flex items-start gap-2">
            <Input
              value={entry}
              onChange={(event) => updateEntry(index, event.target.value)}
              placeholder={placeholder}
              error={invalid}
              aria-invalid={invalid || undefined}
              className="h-9 text-sm"
            />
            <button
              type="button"
              onClick={() => removeEntry(index)}
              className="mt-1 shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              aria-label={`Remove ${title.toLowerCase()} entry ${index + 1}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addEntry}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>

    </FormGroup>
  );
}

interface ProjectEntryFieldProps {
  index: number;
  entry: ProjectFocusEntry;
  onChange: (index: number, entry: ProjectFocusEntry) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  invalid?: boolean;
}

function ProjectEntryField({
  index,
  entry,
  onChange,
  onRemove,
  canRemove,
  invalid = false,
}: ProjectEntryFieldProps): React.ReactNode {
  const updateField = (field: keyof ProjectFocusEntry, value: string): void => {
    onChange(index, { ...entry, [field]: value });
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40',
        invalid ? 'border-error' : ''
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Project / Focus {index + 1}
          </p>
          <p className="text-xs text-muted-foreground">
            Capture the workstream, what you did, and the result.
          </p>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-8 px-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Project / Focus <span className="text-error">*</span>
          </Label>
          <Input
            value={entry.projectFocus}
            onChange={(event) => updateField('projectFocus', event.target.value)}
            placeholder="Example: Employee onboarding guide"
            error={invalid}
            aria-invalid={invalid || undefined}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Challenge <span className="text-error">*</span>
          </Label>
          <Textarea
            value={entry.challenge ?? ''}
            onChange={(event) => updateField('challenge', event.target.value)}
            placeholder="Describe the challenge, blocker, or constraint for this focus area"
            rows={3}
            error={invalid}
            aria-invalid={invalid || undefined}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Action Taken <span className="text-error">*</span>
          </Label>
          <Textarea
            value={entry.actionTaken}
            onChange={(event) => updateField('actionTaken', event.target.value)}
            placeholder="Describe the work you completed for this focus area"
            rows={3}
            error={invalid}
            aria-invalid={invalid || undefined}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Outcome <span className="text-error">*</span>
          </Label>
          <Textarea
            value={entry.outcome}
            onChange={(event) => updateField('outcome', event.target.value)}
            placeholder="State the result, impact, or what moved forward"
            rows={3}
            error={invalid}
            aria-invalid={invalid || undefined}
          />
        </div>
      </div>
    </div>
  );
}

interface EODReportFormProps {
  onSubmit: (data: EODReportFormData & { status: 'draft' | 'submitted' }) => void | Promise<void>;
  onSubmitError?: (message: string, error: unknown) => void;
  isSubmitting?: boolean;
  isSavingDraft?: boolean;
  defaultDate?: string;
  maxHoursPerDay?: number;
  className?: string;
  defaultValues?: Partial<EODReportFormData>;
  editMode?: boolean;
  onCancel?: () => void;
}

interface FormErrors {
  date?: string | undefined;
  hoursLogged?: string | undefined;
  projectEntries?: string | undefined;
  blockers?: string | undefined;
  nextSteps?: string | undefined;
}

function splitLines(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildFallbackProjectEntries(value?: string): Array<ProjectFocusEntry> {
  const lines = splitLines(value);
  if (lines.length === 0) {
    return [
      {
        id: crypto.randomUUID(),
        projectFocus: '',
        challenge: '',
        actionTaken: '',
        outcome: '',
      },
    ];
  }

  return lines.map((line, index) => ({
    id: crypto.randomUUID(),
    projectFocus: `Project / Focus ${index + 1}`,
    challenge: '',
    actionTaken: line,
    outcome: 'Completed for the day',
  }));
}

function trimEntry(entry: ProjectFocusEntry): ProjectFocusEntry {
  return {
    id: entry.id,
    projectFocus: entry.projectFocus.trim(),
    challenge: entry.challenge.trim(),
    actionTaken: entry.actionTaken.trim(),
    outcome: entry.outcome.trim(),
  };
}

function buildInitialProjectEntries(
  defaultValues?: Partial<EODReportFormData>
): Array<ProjectFocusEntry> {
  if (defaultValues?.projectEntries && defaultValues.projectEntries.length > 0) {
    return defaultValues.projectEntries.map((entry) => ({
      id: entry.id || crypto.randomUUID(),
      projectFocus: entry.projectFocus,
      challenge: entry.challenge ?? '',
      actionTaken: entry.actionTaken,
      outcome: entry.outcome,
    }));
  }

  return buildFallbackProjectEntries(defaultValues?.tasksCompleted);
}

function buildInitialExistingAttachments(
  defaultValues?: Partial<EODReportFormData>
): Array<DailyLogAttachment> {
  return defaultValues?.existingAttachments ?? [];
}

export function EODReportForm({
  onSubmit,
  onSubmitError,
  isSubmitting = false,
  isSavingDraft = false,
  defaultDate,
  maxHoursPerDay = 40,
  className,
  defaultValues,
  editMode = false,
  onCancel,
}: EODReportFormProps): React.ReactNode {
  const initialDate = defaultValues?.date ?? defaultDate ?? new Date().toISOString().split('T')[0] ?? '';
  const initialProjectEntries = React.useMemo(
    () => buildInitialProjectEntries(defaultValues),
    [defaultValues]
  );
  const initialBlockers = React.useMemo(
    () =>
      defaultValues?.blockers && defaultValues.blockers.length > 0
        ? defaultValues.blockers
        : splitLines(defaultValues?.challenges),
    [defaultValues]
  );
  const initialNextSteps = React.useMemo(
    () =>
      defaultValues?.nextSteps && defaultValues.nextSteps.length > 0
        ? defaultValues.nextSteps
        : splitLines(defaultValues?.focusTomorrow),
    [defaultValues]
  );
  const initialExistingAttachments = React.useMemo(
    () => buildInitialExistingAttachments(defaultValues),
    [defaultValues]
  );

  const [date, setDate] = React.useState(initialDate);
  const [hoursLogged, setHoursLogged] = React.useState(defaultValues?.hoursLogged ?? 8);
  const [projectEntries, setProjectEntries] = React.useState<Array<ProjectFocusEntry>>(initialProjectEntries);
  const [blockers, setBlockers] = React.useState<string[]>(initialBlockers);
  const [nextSteps, setNextSteps] = React.useState<string[]>(initialNextSteps);
  const [attachments, setAttachments] = React.useState<Array<File>>(defaultValues?.attachments ?? []);
  const [existingAttachments, setExistingAttachments] = React.useState<Array<DailyLogAttachment>>(
    initialExistingAttachments
  );
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const todayIso = React.useMemo(
    () => new Date().toISOString().split('T')[0] ?? '',
    []
  );

  const getSubmissionErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      const message = error.message.trim();
      if (
        message.toLowerCase().includes('already have an eod report for this date') ||
        message.toLowerCase().includes('daily log already exists for this date')
      ) {
        return 'You already submitted an EOD report for this date. Edit the existing report or choose a different date.';
      }

      if (message) {
        return message;
      }
    }

    return 'We could not submit this EOD report. Please try again.';
  };

  const normalizeProjectEntries = (): {
    hasPartialEntry: boolean;
    entries: Array<ProjectFocusEntry>;
  } => {
    const trimmedEntries = projectEntries.map(trimEntry);
    const hasPartialEntry = trimmedEntries.some((entry) => {
      const values = [entry.projectFocus, entry.challenge ?? '', entry.actionTaken, entry.outcome];
      const filledCount = values.filter(Boolean).length;
      return filledCount > 0 && filledCount < values.length;
    });

    return {
      hasPartialEntry,
      entries: trimmedEntries.filter(
        (entry) =>
          entry.projectFocus && entry.challenge && entry.actionTaken && entry.outcome
      ),
    };
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    const normalizedEntries = normalizeProjectEntries();

    if (!date) {
      nextErrors.date = 'Date is required';
    } else if (date > todayIso) {
      nextErrors.date = 'Date cannot be in the future';
    }

    if (hoursLogged <= 0) {
      nextErrors.hoursLogged = 'Hours must be greater than 0';
    } else if (hoursLogged > maxHoursPerDay) {
      nextErrors.hoursLogged = `Maximum ${maxHoursPerDay} hours per day`;
    }

    if (normalizedEntries.hasPartialEntry || normalizedEntries.entries.length === 0) {
      nextErrors.projectEntries =
        'Add at least one complete project entry with project/focus, challenge, action taken, and outcome';
    }

    if (blockers.map((entry) => entry.trim()).filter(Boolean).length === 0) {
      nextErrors.blockers = 'Add at least one current blocker';
    }

    if (nextSteps.map((entry) => entry.trim()).filter(Boolean).length === 0) {
      nextErrors.nextSteps = 'Add at least one next step';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = (status: 'draft' | 'submitted') => {
    const normalizedEntries = normalizeProjectEntries();
    const normalizedBlockers = blockers.map((entry) => entry.trim()).filter(Boolean);
    const normalizedNextSteps = nextSteps.map((entry) => entry.trim()).filter(Boolean);

    return {
      date,
      hoursLogged,
      projectEntries: normalizedEntries.entries,
      ...(normalizedBlockers.length > 0 ? { blockers: normalizedBlockers } : {}),
      ...(normalizedNextSteps.length > 0 ? { nextSteps: normalizedNextSteps } : {}),
      ...(attachments.length > 0 ? { attachments } : {}),
      ...(existingAttachments.length > 0 ? { existingAttachments } : {}),
      status,
    } satisfies EODReportFormData & { status: 'draft' | 'submitted' };
  };

  const handleFormSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    setSubmitError(null);

    try {
      await onSubmit(buildPayload('submitted'));
    } catch (error) {
      const message = getSubmissionErrorMessage(error);
      setSubmitError(message);
      onSubmitError?.(message, error);
    }
  };

  const handleSaveDraft = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    setSubmitError(null);

    try {
      await onSubmit(buildPayload('draft'));
    } catch (error) {
      const message = getSubmissionErrorMessage(error);
      setSubmitError(message);
      onSubmitError?.(message, error);
    }
  };

  const handleProjectEntryChange = (index: number, nextEntry: ProjectFocusEntry): void => {
    setProjectEntries((currentEntries) =>
      currentEntries.map((entry, entryIndex) => (entryIndex === index ? nextEntry : entry))
    );
    if (errors.projectEntries) {
      setErrors((currentErrors) => ({ ...currentErrors, projectEntries: undefined }));
    }
  };

  const handleAddProjectEntry = (): void => {
    setProjectEntries((currentEntries) => [
      ...currentEntries,
      {
        id: crypto.randomUUID(),
        projectFocus: '',
        challenge: '',
        actionTaken: '',
        outcome: '',
      },
    ]);
  };

  const handleRemoveProjectEntry = (index: number): void => {
    setProjectEntries((currentEntries) =>
      currentEntries.filter((_, entryIndex) => entryIndex !== index)
    );
  };

  const handleClear = (): void => {
    setDate(initialDate);
    setHoursLogged(defaultValues?.hoursLogged ?? 8);
    setProjectEntries(initialProjectEntries);
    setBlockers(initialBlockers);
    setNextSteps(initialNextSteps);
    setAttachments(defaultValues?.attachments ?? []);
    setExistingAttachments(initialExistingAttachments);
    setErrors({});
    setSubmitError(null);
  };

  const normalizedProjectEntries = normalizeProjectEntries();
  const hasProjectEntryError = Boolean(errors.projectEntries);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            {editMode ? (
              <FileEdit className="h-5 w-5 text-primary" />
            ) : (
              <Send className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <CardTitle>{editMode ? 'Edit Draft Report' : 'End of Day Report'}</CardTitle>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleFormSubmit}>
        <CardContent className="space-y-6">
          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/5 px-3 py-2 text-sm text-error"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{submitError}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormGroup
              label="Date"
              htmlFor="date"
              required
              showOptional={false}
              error={errors.date}
              icon={<Calendar className="h-4 w-4" />}
            >
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  if (errors.date) {
                    setErrors((currentErrors) => ({ ...currentErrors, date: undefined }));
                  }
                }}
                error={Boolean(errors.date)}
                aria-invalid={Boolean(errors.date) || undefined}
                className="h-9"
              />
            </FormGroup>

            <FormGroup
              label="Hours Logged"
              htmlFor="hours"
              required
              showOptional={false}
              error={errors.hoursLogged}
              description={`Enter up to ${maxHoursPerDay} hours for the day.`}
              icon={<Clock className="h-4 w-4" />}
            >
              <Input
                id="hours"
                type="number"
                step="0.5"
                inputMode="decimal"
                value={hoursLogged}
                onChange={(event) => {
                  setHoursLogged(Number.parseFloat(event.target.value) || 0);
                  if (errors.hoursLogged) {
                    setErrors((currentErrors) => ({ ...currentErrors, hoursLogged: undefined }));
                  }
                }}
                error={Boolean(errors.hoursLogged)}
                aria-invalid={Boolean(errors.hoursLogged) || undefined}
                className="h-9"
              />
            </FormGroup>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                Project / Focus Updates
                <span className="text-error">*</span>
              </Label>
            </div>

            <div className="space-y-3">
              {projectEntries.map((entry, index) => (
                <ProjectEntryField
                  key={entry.id}
                  index={index}
                  entry={entry}
                  onChange={handleProjectEntryChange}
                  onRemove={handleRemoveProjectEntry}
                  canRemove={projectEntries.length > 1}
                  invalid={hasProjectEntryError && normalizedProjectEntries.entries.length === 0}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddProjectEntry}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add another project / focus
            </button>

            <FormErrorMessage message={errors.projectEntries} />
          </div>

          <StringListField
            entries={blockers}
            onChange={(entries) => {
              setBlockers(entries);
              if (errors.blockers) {
                setErrors((currentErrors) => ({ ...currentErrors, blockers: undefined }));
              }
            }}
            placeholder="Waiting on approval, feedback, or dependency"
            addLabel="Add another blocker"
            icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
            title="Current Blockers"
            description=""
            required
            invalid={Boolean(errors.blockers)}
            errorMessage={errors.blockers ?? ''}
          />

          <StringListField
            entries={nextSteps}
            onChange={(entries) => {
              setNextSteps(entries);
              if (errors.nextSteps) {
                setErrors((currentErrors) => ({ ...currentErrors, nextSteps: undefined }));
              }
            }}
            placeholder="Next action or follow-up planned"
            addLabel="Add another next step"
            icon={<Target className="h-4 w-4 text-muted-foreground" />}
            title="Next Steps"
            description=""
            required
            invalid={Boolean(errors.nextSteps)}
            errorMessage={errors.nextSteps ?? ''}
          />

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                Proof Attachments
              </Label>

            </div>

            {existingAttachments.length > 0 && (
              <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Existing attachments
                </p>
                <div className="space-y-2">
                  {existingAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <div className="min-w-0">
                        <a
                          href={attachment.signedUrl ?? '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate font-medium text-zinc-900 hover:text-primary dark:text-zinc-100"
                        >
                          {attachment.fileName}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {Math.max(1, Math.round(attachment.fileSize / 1024))} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setExistingAttachments((currentAttachments) =>
                            currentAttachments.filter(
                              (currentAttachment) => currentAttachment.id !== attachment.id
                            )
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <FileDropZone
              onFilesSelected={(files) => {
                setAttachments((currentFiles) => [...currentFiles, ...files]);
              }}
              multiple
              maxFiles={10}
              maxSizeMB={10}
              compact
              label="Drop supporting files or browse"
              formatHint="PDF, DOC, DOCX, TXT, JPG, PNG, WEBP, GIF — max 10 MB each"
              selectedFiles={attachments}
              onRemoveFile={(index) => {
                setAttachments((currentFiles) =>
                  currentFiles.filter((_, fileIndex) => fileIndex !== index)
                );
              }}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col-reverse items-stretch gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={handleClear}>
              Clear
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
            >
              {isSavingDraft ? 'Saving draft...' : 'Save Draft'}
            </Button>
            <Button type="submit" disabled={isSubmitting || isSavingDraft}>
              {isSubmitting ? 'Submitting...' : editMode ? 'Update and Submit' : 'Submit Report'}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
