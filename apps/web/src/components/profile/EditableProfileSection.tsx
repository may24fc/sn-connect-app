'use client';

import {
  BentoCard,
  BentoCardHeader,
  BentoCardTitle,
  BentoCardContent,
} from '@/components/data-display';
import { Input, Skeleton } from '@hr-portal/ui';
import { Check, Pencil, X } from 'lucide-react';
import { useCallback, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface EditableField {
  /** API field key (camelCase, matches ProfileInfoUpdate) */
  key: string;
  /** Display label */
  label: string;
  /** Icon element */
  icon: React.ReactNode;
  /** Current display value (formatted for view mode) */
  displayValue: string | null | undefined;
  /** Raw editable value (unformatted, e.g. ISO date for birthday) */
  editValue?: string | undefined;
  /** Input type: text | email | url | date | tel */
  inputType?: 'text' | 'email' | 'url' | 'date' | 'tel' | undefined;
  /** If true, this field cannot be edited (e.g. computed "age") */
  readOnly?: boolean | undefined;
  /** Optional link href for view mode */
  href?: string | undefined;
  /** Whether the link opens externally */
  isExternal?: boolean | undefined;
  /** Placeholder text */
  placeholder?: string | undefined;
}

interface EditableProfileSectionProps {
  /** Card title */
  title: string;
  /** Icon displayed in the card header */
  titleIcon: React.ReactNode;
  /** Fields to render */
  fields: EditableField[];
  /** Loading state — shows skeletons */
  isLoading?: boolean;
  /** Called when save is clicked — receives only changed fields */
  onSave: (updates: Record<string, string>) => Promise<void>;
  /** Whether a save is currently in-flight */
  isSaving?: boolean;
  /** Optional colSpan for the bento card */
  colSpan?: 1 | 2 | 3 | 4 | undefined;
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function ViewField({ field }: { field: EditableField }): React.ReactNode {
  const displayValue = field.displayValue || '—';

  const content =
    field.href && field.displayValue ? (
      <a
        href={field.href}
        target={field.isExternal ? '_blank' : undefined}
        rel={field.isExternal ? 'noopener noreferrer' : undefined}
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
      >
        {displayValue}
      </a>
    ) : (
      <p className="text-sm text-zinc-900 dark:text-zinc-100">{displayValue}</p>
    );

  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-zinc-400 dark:text-zinc-500">{field.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{field.label}</p>
        {content}
      </div>
    </div>
  );
}

function EditField({
  field,
  value,
  onChange,
}: {
  field: EditableField;
  value: string;
  onChange: (key: string, value: string) => void;
}): React.ReactNode {
  if (field.readOnly) {
    return <ViewField field={field} />;
  }

  return (
    <div className="flex items-start gap-3">
      <span className="mt-1.5 text-zinc-400 dark:text-zinc-500">{field.icon}</span>
      <div className="min-w-0 flex-1">
        <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5 block">
          {field.label}
        </label>
        <Input
          type={field.inputType ?? 'text'}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder ?? field.label}
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}

function FieldSkeleton({ rows = 3 }: { rows?: number }): React.ReactNode {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`skeleton-${i.toString()}`} className="flex items-start gap-3">
          <Skeleton className="h-4 w-4 mt-0.5 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export function EditableProfileSection({
  title,
  titleIcon,
  fields,
  isLoading = false,
  onSave,
  isSaving = false,
  colSpan,
}: EditableProfileSectionProps): React.ReactNode {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const editableFields = fields.filter((f) => !f.readOnly);

  const handleStartEditing = useCallback(() => {
    // Seed draft with current values for all editable fields
    const initial: Record<string, string> = {};
    for (const field of editableFields) {
      initial[field.key] = field.editValue ?? field.displayValue ?? '';
    }
    setDraft(initial);
    setIsEditing(true);
  }, [editableFields]);

  const handleCancel = useCallback(() => {
    setDraft({});
    setIsEditing(false);
  }, []);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    // Only send fields that actually changed
    const changes: Record<string, string> = {};
    for (const field of editableFields) {
      const original = field.editValue ?? field.displayValue ?? '';
      const current = draft[field.key] ?? '';
      if (current !== original) {
        changes[field.key] = current;
      }
    }

    if (Object.keys(changes).length === 0) {
      // Nothing changed — just close
      setIsEditing(false);
      return;
    }

    try {
      await onSave(changes);
      setIsEditing(false);
      setDraft({});
    } catch {
      // Keep edit mode open on failure — error handled by caller
    }
  }, [draft, editableFields, onSave]);

  return (
    <BentoCard {...(colSpan ? { colSpan } : {})} className="group relative">
      <BentoCardHeader>
        <BentoCardTitle icon={titleIcon}>{title}</BentoCardTitle>

        {/* Edit / Save / Cancel controls */}
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex h-7 w-7 items-center justify-center rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors disabled:opacity-50"
                aria-label="Save changes"
              >
                {isSaving ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                aria-label="Cancel editing"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartEditing}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label={`Edit ${title}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </BentoCardHeader>

      <BentoCardContent>
        {isLoading ? (
          <FieldSkeleton rows={fields.length} />
        ) : (
          <div className="space-y-4">
            {fields.map((field) =>
              isEditing && !field.readOnly ? (
                <EditField
                  key={field.key}
                  field={field}
                  value={draft[field.key] ?? ''}
                  onChange={handleFieldChange}
                />
              ) : (
                <ViewField key={field.key} field={field} />
              )
            )}
          </div>
        )}
      </BentoCardContent>
    </BentoCard>
  );
}
