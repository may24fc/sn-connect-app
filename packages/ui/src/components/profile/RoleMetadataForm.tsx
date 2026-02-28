'use client';

import { Briefcase, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import * as React from 'react';
import { Badge } from '../../primitives/badge';
import { Button } from '../../primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../primitives/card';
import { Input } from '../../primitives/input';
import { Label } from '../../primitives/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';
import { cn } from '../../utils/cn';

// --- Types ---

export interface RoleMetadataFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'url' | 'tags' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface RoleTypeConfig {
  label: string;
  description: string;
  icon: string;
  fields: RoleMetadataFieldConfig[];
}

export interface RoleMetadataFormProps {
  roleType: string;
  roleConfig: RoleTypeConfig;
  metadata: Record<string, unknown>;
  onSave: (roleType: string, metadata: Record<string, unknown>) => Promise<void>;
  onDelete?: ((roleType: string) => Promise<void>) | undefined;
  isSaving?: boolean | undefined;
  isDeleting?: boolean | undefined;
  className?: string;
}

export interface RoleMetadataFormContainerProps {
  /**
   * All metadata records for the user, each with its role_type and metadata.
   */
  metadataRecords: Array<{ role_type: string; metadata: Record<string, unknown> }>;
  /**
   * Registry of all available role types with their field configurations.
   */
  roleTypeRegistry: Record<string, RoleTypeConfig>;
  /**
   * Called when saving metadata for a role_type.
   */
  onSave: (roleType: string, metadata: Record<string, unknown>) => Promise<void>;
  /**
   * Called when deleting metadata for a role_type.
   */
  onDelete?: ((roleType: string) => Promise<void>) | undefined;
  /**
   * Whether a save is in progress.
   */
  isSaving?: boolean | undefined;
  /**
   * Whether a delete is in progress.
   */
  isDeleting?: boolean | undefined;
  className?: string;
}

// --- Tags Input Sub-Component ---

function TagsInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  options?: string[] | undefined;
  placeholder?: string | undefined;
}): React.ReactNode {
  const [inputValue, setInputValue] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!options) return [];
    return options.filter(
      (opt) => !value.includes(opt) && opt.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [options, value, inputValue]);

  const addTag = (tag: string): void => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tag: string): void => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      const lastTag = value[value.length - 1];
      if (lastTag) removeTag(lastTag);
    }
  };

  // Close suggestions on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 min-h-[40px] focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-1">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 h-6 text-xs">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 hover:text-red-500 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder || 'Add tags...' : 'Add more...'}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none"
        />
      </div>

      {/* Suggestion Dropdown */}
      {showSuggestions && filteredOptions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-auto">
          {filteredOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => addTag(opt)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus className="h-3 w-3 text-muted-foreground" />
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Individual Role Metadata Form ---

// --- Read-Only Field Value Display ---

function FieldValueDisplay({
  field,
  value,
}: {
  field: RoleMetadataFieldConfig;
  value: unknown;
}): React.ReactNode {
  if (field.type === 'tags') {
    const tags = (value as string[] | undefined) || [];
    if (tags.length === 0) return <p className="text-sm text-zinc-400 dark:text-zinc-500">—</p>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs h-6">
            {tag}
          </Badge>
        ))}
      </div>
    );
  }

  if (field.type === 'url') {
    const url = (value as string) || '';
    if (!url) return <p className="text-sm text-zinc-400 dark:text-zinc-500">—</p>;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        {url}
      </a>
    );
  }

  const display = value != null && value !== '' ? String(value) : '—';
  return <p className="text-sm text-zinc-900 dark:text-zinc-100">{display}</p>;
}

export function RoleMetadataForm({
  roleType,
  roleConfig,
  metadata,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
  className,
}: RoleMetadataFormProps): React.ReactNode {
  const [formData, setFormData] = React.useState<Record<string, unknown>>(metadata);
  const [isDirty, setIsDirty] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  const handleFieldChange = (key: string, value: unknown): void => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async (): Promise<void> => {
    await onSave(roleType, formData);
    setIsDirty(false);
    setIsEditing(false);
  };

  const handleDelete = async (): Promise<void> => {
    if (onDelete) {
      await onDelete(roleType);
    }
  };

  const handleCancel = (): void => {
    setFormData(metadata);
    setIsDirty(false);
    setIsEditing(false);
  };

  return (
    <Card className={cn('relative', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
              <Briefcase className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-base">{roleConfig.label}</CardTitle>
              <CardDescription className="text-xs">{roleConfig.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && isDirty && (
              <Badge
                variant="outline"
                className="text-xs text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
              >
                Unsaved
              </Badge>
            )}
            {isEditing ? (
              <>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-zinc-400 dark:text-zinc-500 hover:text-red-500 h-8 w-8 p-0"
                    aria-label={`Remove ${roleConfig.label} details`}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 h-8 w-8 p-0"
                aria-label={`Edit ${roleConfig.label} details`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            {roleConfig.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`${roleType}-${field.key}`} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </Label>

                {field.type === 'text' && (
                  <Input
                    id={`${roleType}-${field.key}`}
                    type="text"
                    value={(formData[field.key] as string) || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}

                {field.type === 'number' && (
                  <Input
                    id={`${roleType}-${field.key}`}
                    type="number"
                    value={(formData[field.key] as number) ?? ''}
                    onChange={(e) =>
                      handleFieldChange(
                        field.key,
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder={field.placeholder}
                  />
                )}

                {field.type === 'url' && (
                  <Input
                    id={`${roleType}-${field.key}`}
                    type="url"
                    value={(formData[field.key] as string) || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder || 'https://...'}
                  />
                )}

                {field.type === 'tags' && (
                  <TagsInput
                    value={(formData[field.key] as string[]) || []}
                    onChange={(tags) => handleFieldChange(field.key, tags)}
                    options={field.options}
                    placeholder={field.placeholder}
                  />
                )}

                {field.type === 'select' && field.options && (
                  <Select
                    value={(formData[field.key] as string) || ''}
                    onValueChange={(value) => handleFieldChange(field.key, value)}
                  >
                    <SelectTrigger id={`${roleType}-${field.key}`}>
                      <SelectValue
                        placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}

            {/* Action Buttons — only visible in edit mode */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                size="sm"
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>
        ) : (
          /* View mode — read-only display */
          <div className="space-y-3">
            {roleConfig.fields.map((field) => (
              <div key={field.key} className="space-y-0.5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{field.label}</p>
                <FieldValueDisplay field={field} value={formData[field.key]} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Container Component (with role type selector) ---

export function RoleMetadataFormContainer({
  metadataRecords,
  roleTypeRegistry,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
  className,
}: RoleMetadataFormContainerProps): React.ReactNode {
  const [showAddRole, setShowAddRole] = React.useState(false);
  const [selectedNewRole, setSelectedNewRole] = React.useState<string>('');

  const existingRoleTypes = metadataRecords.map((r) => r.role_type);
  const availableRoleTypes = Object.entries(roleTypeRegistry).filter(
    ([key]) => !existingRoleTypes.includes(key)
  );

  const handleAddRole = (): void => {
    if (selectedNewRole && roleTypeRegistry[selectedNewRole]) {
      onSave(selectedNewRole, {});
      setSelectedNewRole('');
      setShowAddRole(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Role Details</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Add role-specific information to help the team understand your expertise
          </p>
        </div>
        {availableRoleTypes.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddRole(!showAddRole)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Role
          </Button>
        )}
      </div>

      {/* Add Role Selector */}
      {showAddRole && (
        <Card className="border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/20">
          <CardContent className="py-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="new-role-type" className="text-sm font-medium">
                  Select Role Type
                </Label>
                <Select value={selectedNewRole} onValueChange={setSelectedNewRole}>
                  <SelectTrigger id="new-role-type">
                    <SelectValue placeholder="Choose a role type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoleTypes.map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddRole} disabled={!selectedNewRole} size="sm">
                Add
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddRole(false)}>
                Cancel
              </Button>
            </div>
            {selectedNewRole && roleTypeRegistry[selectedNewRole] && (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {roleTypeRegistry[selectedNewRole].description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing Metadata Forms */}
      {metadataRecords.length === 0 && !showAddRole && (
        <Card>
          <CardContent className="py-8 text-center">
            <Briefcase className="h-10 w-10 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No role details added yet. Click &quot;Add Role&quot; to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {metadataRecords.map((record) => {
        const config = roleTypeRegistry[record.role_type];
        if (!config) return null;
        return (
          <RoleMetadataForm
            key={record.role_type}
            roleType={record.role_type}
            roleConfig={config}
            metadata={record.metadata}
            onSave={onSave}
            onDelete={onDelete}
            isSaving={isSaving}
            isDeleting={isDeleting}
          />
        );
      })}
    </div>
  );
}
