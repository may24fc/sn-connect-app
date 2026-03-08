'use client';

import {
  AlertCircle,
  Calendar,
  CheckSquare,
  Clock,
  Plus,
  Send,
  Target,
  X,
} from 'lucide-react';
import * as React from 'react';
import { Button } from '../../primitives/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../primitives/card';
import { Input } from '../../primitives/input';
import { Label } from '../../primitives/label';
import type { EODReportFormData } from '../../types/internship.types';
import { cn } from '../../utils/cn';

// ─── Multi-Entry Input ───────────────────────────────────────────────────────
// A reusable sub-component: renders a list of short text inputs with add/remove.

interface MultiEntryFieldProps {
  entries: string[];
  onChange: (entries: string[]) => void;
  placeholder: string;
  addLabel: string;
  error?: string | undefined;
  minEntries?: number | undefined;
}

function MultiEntryField({
  entries,
  onChange,
  placeholder,
  addLabel,
  error,
  minEntries = 1,
}: MultiEntryFieldProps): React.ReactNode {
  const lastInputRef = React.useRef<HTMLInputElement>(null);

  const handleEntryChange = (index: number, value: string): void => {
    const updated = [...entries];
    updated[index] = value;
    onChange(updated);
  };

  const handleAddEntry = (): void => {
    onChange([...entries, '']);
    // Focus the new input after render
    requestAnimationFrame(() => {
      lastInputRef.current?.focus();
    });
  };

  const handleRemoveEntry = (index: number): void => {
    if (entries.length <= minEntries) return;
    onChange(entries.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If current field has text, add a new entry
      if (entries[index]?.trim()) {
        handleAddEntry();
      }
    }
    // Backspace on empty field removes it (if not the last required one)
    if (e.key === 'Backspace' && !entries[index]?.trim() && entries.length > minEntries) {
      e.preventDefault();
      handleRemoveEntry(index);
    }
  };

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <div key={`entry-${index}`} className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {index + 1}
          </span>
          <Input
            ref={index === entries.length - 1 ? lastInputRef : undefined}
            value={entry}
            onChange={(e) => handleEntryChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            placeholder={index === 0 ? placeholder : 'Add another...'}
            className={cn(
              'h-9 text-sm',
              error && index === 0 && !entry.trim() ? 'border-error' : ''
            )}
          />
          {entries.length > minEntries && (
            <button
              type="button"
              onClick={() => handleRemoveEntry(index)}
              className="shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddEntry}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

// ─── EOD Report Form ─────────────────────────────────────────────────────────

interface EODReportFormProps {
  onSubmit: (data: EODReportFormData) => void | Promise<void>;
  isSubmitting?: boolean;
  defaultDate?: string;
  maxHoursPerDay?: number;
  className?: string;
}

export function EODReportForm({
  onSubmit,
  isSubmitting = false,
  defaultDate,
  maxHoursPerDay = 12,
  className,
}: EODReportFormProps): React.ReactNode {
  const initialDate = defaultDate ?? new Date().toISOString().split('T')[0]!;

  // Multi-entry arrays for each text field
  const [date, setDate] = React.useState(initialDate);
  const [hoursLogged, setHoursLogged] = React.useState(8);
  const [challengeEntries, setChallengeEntries] = React.useState<string[]>(['']);
  const [taskEntries, setTaskEntries] = React.useState<string[]>(['']);
  const [focusEntries, setFocusEntries] = React.useState<string[]>(['']);

  const [errors, setErrors] = React.useState<Partial<Record<keyof EODReportFormData, string>>>({});

  // Join non-empty entries with newlines for the final string output
  const joinEntries = (entries: string[]): string =>
    entries
      .map((e) => e.trim())
      .filter(Boolean)
      .join('\n');

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EODReportFormData, string>> = {};

    if (!date) {
      newErrors.date = 'Date is required';
    }

    if (hoursLogged <= 0) {
      newErrors.hoursLogged = 'Hours must be greater than 0';
    } else if (hoursLogged > maxHoursPerDay) {
      newErrors.hoursLogged = `Maximum ${maxHoursPerDay} hours per day`;
    }

    const tasks = joinEntries(taskEntries);
    if (!tasks) {
      newErrors.tasksCompleted = 'Add at least one task you completed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (validateForm()) {
      const challenges = joinEntries(challengeEntries);
      const focusTomorrow = joinEntries(focusEntries);
      const formData: EODReportFormData = {
        date,
        hoursLogged,
        tasksCompleted: joinEntries(taskEntries),
        ...(challenges ? { challenges } : {}),
        ...(focusTomorrow ? { focusTomorrow } : {}),
      };
      await onSubmit(formData);
    }
  };

  const handleClear = (): void => {
    setDate(initialDate);
    setHoursLogged(8);
    setChallengeEntries(['']);
    setTaskEntries(['']);
    setFocusEntries(['']);
    setErrors({});
  };

  // Clear individual field errors when user types
  const handleTaskChange = (entries: string[]): void => {
    setTaskEntries(entries);
    if (errors.tasksCompleted) {
      const { tasksCompleted: _, ...rest } = errors;
      setErrors(rest);
    }
  };

  const clearError = (field: keyof EODReportFormData): void => {
    if (errors[field]) {
      setErrors((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Send className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>End of Day Report</CardTitle>
            <CardDescription>Submit your daily progress report</CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Date and Hours Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date" className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  clearError('date');
                }}
                max={new Date().toISOString().split('T')[0]}
                className={cn('h-9', errors.date ? 'border-error' : '')}
              />
              {errors.date && <p className="text-xs text-error">{errors.date}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hours" className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Hours Logged
              </Label>
              <Input
                id="hours"
                type="number"
                min="0.5"
                max={maxHoursPerDay}
                step="0.5"
                value={hoursLogged}
                onChange={(e) => {
                  setHoursLogged(Number.parseFloat(e.target.value) || 0);
                  clearError('hoursLogged');
                }}
                className={cn('h-9', errors.hoursLogged ? 'border-error' : '')}
              />
              {errors.hoursLogged && <p className="text-xs text-error">{errors.hoursLogged}</p>}
            </div>
          </div>

          {/* Challenges/Blockers — multi-entry (optional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Challenges / Blockers
              <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
            </Label>
            <p className="text-xs text-muted-foreground -mt-0.5">
              Any blockers or difficulties you encountered today?
            </p>
            <MultiEntryField
              entries={challengeEntries}
              onChange={setChallengeEntries}
              placeholder="What blocked or slowed you down?"
              addLabel="Add another blocker"
              minEntries={0}
            />
          </div>

          {/* Tasks Completed — multi-entry */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              Tasks Completed
              <span className="text-error">*</span>
            </Label>
            <p className="text-xs text-muted-foreground -mt-0.5">
              What did you accomplish today? One task per line.
            </p>
            <MultiEntryField
              entries={taskEntries}
              onChange={handleTaskChange}
              placeholder="Completed task..."
              addLabel="Add another task"
              error={errors.tasksCompleted}
            />
          </div>

          {/* Focus Tomorrow — multi-entry (optional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-muted-foreground" />
              Focus Tomorrow
              <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
            </Label>
            <p className="text-xs text-muted-foreground -mt-0.5">
              What will you focus on tomorrow?
            </p>
            <MultiEntryField
              entries={focusEntries}
              onChange={setFocusEntries}
              placeholder="Tomorrow I will..."
              addLabel="Add another focus item"
              minEntries={0}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Report
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
