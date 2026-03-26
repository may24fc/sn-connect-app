import { Grid2X2, List, Search } from 'lucide-react';
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
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
        <Input
          placeholder="Search announcements"
          value={value.search}
          onChange={(event) => onChange({ ...value, search: event.target.value })}
          className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
        />
      </div>

      <Select value={value.status} onValueChange={(status) => onChange({ ...value, status })}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status === 'all' ? 'Status' : formatLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.category} onValueChange={(category) => onChange({ ...value, category })}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category} value={category}>
              {category === 'all' ? 'Category' : formatLabel(category)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.priority} onValueChange={(priority) => onChange({ ...value, priority })}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          {priorities.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {priority === 'all' ? 'Priority' : formatLabel(priority)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showViewToggle && (
        <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-0.5 ml-auto">
          <button
            type="button"
            onClick={() => onChange({ ...value, view: 'card' })}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              value.view === 'card'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
            aria-label="Card view"
          >
            <Grid2X2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Cards
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, view: 'list' })}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              value.view === 'list'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
            aria-label="List view"
          >
            <List className="h-3.5 w-3.5" strokeWidth={1.5} />
            List
          </button>
        </div>
      )}
    </div>
  );
}
