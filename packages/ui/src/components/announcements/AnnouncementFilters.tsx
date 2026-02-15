import { Input } from '../../primitives/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';

export interface AnnouncementFiltersValue {
  search: string;
  status: string;
  category: string;
  priority: string;
}

export interface AnnouncementFiltersProps {
  value: AnnouncementFiltersValue;
  onChange: (value: AnnouncementFiltersValue) => void;
  statuses?: Array<string>;
  categories?: Array<string>;
  priorities?: Array<string>;
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
              {status}
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
              {category}
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
              {priority}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
