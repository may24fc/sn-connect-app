'use client';

import { AlertCircle, Calendar, ClipboardList, FileText, Loader2, Tag, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '../../primitives/button';
import { Badge } from '../../primitives/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';
import { Textarea } from '../../primitives/textarea';
import type { TaskAssignee, TaskFormData, TaskPriority, TaskCategory } from '../../types/task.types';
import { TASK_CATEGORIES } from '../../types/task.types';
import { cn } from '../../utils/cn';
import { TaskAssigneeSelect } from './TaskAssigneeSelect';

export interface TaskFormProps {
  onSubmit: (data: TaskFormData) => Promise<void>;
  employees: Array<TaskAssignee>;
  isSubmitting?: boolean;
  initialData?: Partial<TaskFormData>;
  mode?: 'create' | 'edit';
  className?: string;
}

// --- Tag Input Sub-Component ---

function TaskTagsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}): React.ReactNode {
  const [inputValue, setInputValue] = React.useState('');

  const addTag = (tag: string): void => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
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

  return (
    <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 min-h-[40px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 h-6 text-xs">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-0.5 hover:text-destructive transition-colors"
            aria-label={`Remove tag: ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? 'Add tags (press Enter or comma)...' : 'Add more...'}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function TaskForm({
  onSubmit,
  employees,
  isSubmitting = false,
  initialData,
  mode = 'create',
  className,
}: TaskFormProps): React.ReactNode {
  const [formData, setFormData] = React.useState<TaskFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    priority: initialData?.priority || 'medium',
    dueDate: initialData?.dueDate || '',
    category: initialData?.category || undefined,
    tags: initialData?.tags || [],
    assigneeIds: initialData?.assigneeIds || [],
  });

  const [errors, setErrors] = React.useState<Partial<Record<keyof TaskFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TaskFormData, string>> = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Please provide more detail (at least 20 characters)';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    // Due date validation
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        newErrors.dueDate = 'Due date must be in the future';
      }
    }

    // Assignee validation
    if (formData.assigneeIds.length === 0) {
      newErrors.assigneeIds = 'Please assign at least one person';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  const handleChange = (
    field: keyof TaskFormData,
    value: string | Array<string> | TaskPriority | TaskCategory | undefined
  ): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleReset = (): void => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      category: undefined,
      tags: [],
      assigneeIds: [],
    });
    setErrors({});
  };

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>{mode === 'create' ? 'Create New Task' : 'Edit Task'}</CardTitle>
            <CardDescription>
              {mode === 'create'
                ? 'Assign tasks to team members with clear priorities and deadlines'
                : 'Update task details and assignments'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Title *
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="e.g., Review Q1 financial reports"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={errors.title ? 'border-error' : ''}
              maxLength={200}
            />
            {errors.title && (
              <p className="text-xs text-error flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Priority and Due Date Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                Priority *
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value: TaskPriority) => handleChange('priority', value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Due Date *
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                min={minDate}
                className={errors.dueDate ? 'border-error' : ''}
              />
              {errors.dueDate && (
                <p className="text-xs text-error flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.dueDate}
                </p>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Category (Optional)
            </Label>
            <Select
              value={formData.category || '_none'}
              onValueChange={(value: string) =>
                handleChange('category', value === '_none' ? undefined : value as TaskCategory)
              }
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No Category</SelectItem>
                {TASK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Tags (Optional)
            </Label>
            <TaskTagsInput
              value={formData.tags || []}
              onChange={(tags) => handleChange('tags', tags)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Description *
            </Label>
            <Textarea
              id="description"
              placeholder="Provide detailed instructions and expectations for this task..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className={cn('min-h-[120px]', errors.description ? 'border-error' : '')}
              maxLength={2000}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div>
                {errors.description && (
                  <p className="text-error flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.description}
                  </p>
                )}
              </div>
              <span>{formData.description.length} / 2000</span>
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <TaskAssigneeSelect
              selectedIds={formData.assigneeIds}
              onSelectionChange={(ids) => handleChange('assigneeIds', ids)}
              employees={employees}
            />
            {errors.assigneeIds && (
              <p className="text-xs text-error flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.assigneeIds}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={handleReset} disabled={isSubmitting}>
            Clear
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                <ClipboardList className="mr-2 h-4 w-4" />
                {mode === 'create' ? 'Create Task' : 'Update Task'}
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
