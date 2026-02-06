'use client';

import * as React from 'react';
import {
  ClipboardList,
  Calendar,
  AlertCircle,
  Loader2,
  Tag,
  FileText,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '../../primitives/card';
import { Button } from '../../primitives/button';
import { Input } from '../../primitives/input';
import { Textarea } from '../../primitives/textarea';
import { Label } from '../../primitives/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';
import { TaskAssigneeSelect } from './TaskAssigneeSelect';
import { cn } from '../../utils/cn';
import type { TaskFormData, TaskAssignee, TaskPriority } from '../../types/task.types';

export interface TaskFormProps {
  onSubmit: (data: TaskFormData) => Promise<void>;
  employees: TaskAssignee[];
  isSubmitting?: boolean;
  initialData?: Partial<TaskFormData>;
  mode?: 'create' | 'edit';
  className?: string;
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
    category: initialData?.category || '',
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
    value: string | string[] | TaskPriority
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
      category: '',
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
            <CardTitle>
              {mode === 'create' ? 'Create New Task' : 'Edit Task'}
            </CardTitle>
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
            <Input
              id="category"
              type="text"
              placeholder="e.g., Finance, HR, Development"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              maxLength={50}
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
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSubmitting}
          >
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
