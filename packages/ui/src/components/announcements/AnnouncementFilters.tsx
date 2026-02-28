import { Grid2X2, List } from 'lucide-react';
import { Button } from '../../primitives/button';
import { Input } from '../../primitives/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';

export type AnnouncementViewType = 'card' | 'list';

export interface AnnouncementFiltersValue {
  search: string;
  status: string;
  category: string;
  priority: string;
  view: AnnouncementViewType;
}

export interface AnnouncementFiltersProps {
  value: AnnouncementFiltersValue;
  onChange: (value: AnnouncementFiltersValue) => void;
  statuses?: Array<string>;
  categories?: Array<string>;
  priorities?: Array<string>;
  showViewToggle?: boolean;
}

/** Formats filter values to human-readable labels */
function formatLabel(value: string): string {
  if (value === 'all') return 'All';
  if (value === 'hr_updates') return 'HR Updates';
  // Capitalize first letter of each word and replace underscores with spaces
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function AnnouncementFilters({
  value,
  onChange,
  statuses = ['all', 'draft', 'scheduled', 'published', 'expired', 'archived'],
  categories = [
    'all',
    'hr_updates',
    'benefits',
    'events',
    'performance',
    'training',
    'policy',
    'general',
    'emergency',
  ],
  priorities = ['all', 'low', 'normal', 'high', 'urgent'],
  showViewToggle = true,
}: AnnouncementFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Input
        placeholder="Search announcements"
        value={value.search}
        onChange={(event) => onChange({ ...value, search: event.target.value })}
        className="max-w-sm"
      />

      <Select value={value.status} onValueChange={(status) => onChange({ ...value, status })}>
        <SelectTrigger className="w-[170px] border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {formatLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.category} onValueChange={(category) => onChange({ ...value, category })}>
        <SelectTrigger className="w-[170px] border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category} value={category}>
              {formatLabel(category)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.priority} onValueChange={(priority) => onChange({ ...value, priority })}>
        <SelectTrigger className="w-[170px] border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          {priorities.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {formatLabel(priority)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showViewToggle && (
        <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...value, view: 'card' })}
            className={`rounded-none px-3 py-2 ${
              value.view === 'card'
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50'
            }`}
            aria-label="Card view"
            title="Card view"
          >
            <Grid2X2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...value, view: 'list' })}
            className={`rounded-none px-3 py-2 ${
              value.view === 'list'
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50'
            }`}
            aria-label="List view"
            title="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
