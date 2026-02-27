'use client';

import { Calendar, Search, X } from 'lucide-react';
import type * as React from 'react';
import { Button } from '../../primitives/button';
import { Input } from '../../primitives/input';
import { Label } from '../../primitives/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';
import type { TaskFilters } from '../../types/task.types';
import { TASK_CATEGORIES } from '../../types/task.types';
import { cn } from '../../utils/cn';

export interface TaskFiltersProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  assigneeOptions?: Array<{ id: string; name: string }>;
  showAssigneeFilter?: boolean;
  className?: string;
}

export function TaskFilters({
  filters,
  onFiltersChange,
  assigneeOptions = [],
  showAssigneeFilter = false,
  className,
}: TaskFiltersProps): React.ReactNode {
  const handleFilterChange = (key: keyof TaskFilters, value: string | undefined): void => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' || value === '' ? undefined : value,
    });
  };

  const handleClearFilters = (): void => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.priority ||
    filters.category ||
    filters.assigneeId ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="search" className="sr-only">
            Search tasks
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder="Search tasks..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-[180px]">
          <Label htmlFor="status" className="sr-only">
            Filter by status
          </Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="w-full sm:w-[180px]">
          <Label htmlFor="priority" className="sr-only">
            Filter by priority
          </Label>
          <Select
            value={filters.priority || 'all'}
            onValueChange={(value) => handleFilterChange('priority', value)}
          >
            <SelectTrigger id="priority">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="w-full sm:w-[180px]">
          <Label htmlFor="category" className="sr-only">
            Filter by category
          </Label>
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) => handleFilterChange('category', value)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {TASK_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assignee Filter (Optional - for admin view) */}
        {showAssigneeFilter && assigneeOptions.length > 0 && (
          <div className="w-full sm:w-[200px]">
            <Label htmlFor="assignee" className="sr-only">
              Filter by assignee
            </Label>
            <Select
              value={filters.assigneeId || 'all'}
              onValueChange={(value) => handleFilterChange('assigneeId', value)}
            >
              <SelectTrigger id="assignee">
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {assigneeOptions.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button variant="outline" size="default" onClick={handleClearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Date Range Filters (Optional - can be expanded) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Label htmlFor="dateFrom" className="text-sm text-muted-foreground">
            Due Date From
          </Label>
          <div className="relative mt-1">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex-1">
          <Label htmlFor="dateTo" className="text-sm text-muted-foreground">
            Due Date To
          </Label>
          <div className="relative mt-1">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
