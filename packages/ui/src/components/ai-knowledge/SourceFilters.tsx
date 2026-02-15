'use client';

import { Filter, Search } from 'lucide-react';
import type * as React from 'react';
import { Input } from '../../primitives/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';
import type { FilterOption } from '../../types/ai-knowledge.types';
import { cn } from '../../utils/cn';

export interface SourceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterOption: FilterOption;
  onFilterChange: (option: FilterOption) => void;
  className?: string;
}

export function SourceFilters({
  searchQuery,
  onSearchChange,
  filterOption,
  onFilterChange,
  className,
}: SourceFiltersProps): React.ReactNode {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-3', className)}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sm text-muted-foreground/70" />
        <Input
          type="search"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10 rounded-lg border-border/60 focus:border-primary/40"
          aria-label="Search knowledge base files"
        />
      </div>

      {/* Filter Dropdown */}
      <Select value={filterOption} onValueChange={(value) => onFilterChange(value as FilterOption)}>
        <SelectTrigger className="w-full sm:w-36 h-10 rounded-lg border-border/60">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground/70" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Files</SelectItem>
          <SelectItem value="ready">Ready</SelectItem>
          <SelectItem value="indexing">Processing</SelectItem>
          <SelectItem value="error">Errors</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
