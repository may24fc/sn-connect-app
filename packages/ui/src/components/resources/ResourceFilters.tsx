import { Input } from '../../primitives/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';

export interface ResourceFiltersValue {
  search: string;
  status: string;
  category: string;
  resourceType: string;
}

export interface ResourceFiltersProps {
  value: ResourceFiltersValue;
  onChange: (value: ResourceFiltersValue) => void;
  statuses?: Array<string>;
  categories?: Array<{ value: string; label: string }>;
  resourceTypes?: Array<{ value: string; label: string }>;
  showStatus?: boolean;
}

const defaultCategories = [
  { value: 'all', label: 'All Categories' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'training', label: 'Training' },
  { value: 'policies', label: 'Policies' },
  { value: 'benefits', label: 'Benefits' },
  { value: 'tools', label: 'Tools' },
  { value: 'culture', label: 'Culture' },
  { value: 'department_specific', label: 'Department' },
  { value: 'forms_templates', label: 'Forms' },
  { value: 'performance', label: 'Performance' },
  { value: 'emergency', label: 'Emergency' },
];

const defaultTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
  { value: 'image', label: 'Image' },
  { value: 'link', label: 'Link' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'interactive', label: 'Interactive' },
];

export function ResourceFilters({
  value,
  onChange,
  statuses = ['all', 'draft', 'published', 'archived'],
  categories = defaultCategories,
  resourceTypes = defaultTypes,
  showStatus = false,
}: ResourceFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <Input
        placeholder="Search resources..."
        value={value.search}
        onChange={(event) => onChange({ ...value, search: event.target.value })}
        className="max-w-sm"
      />

      <Select value={value.category} onValueChange={(category) => onChange({ ...value, category })}>
        <SelectTrigger className="w-[170px] border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.resourceType}
        onValueChange={(resourceType) => onChange({ ...value, resourceType })}
      >
        <SelectTrigger className="w-[170px] border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {resourceTypes.map((rt) => (
            <SelectItem key={rt.value} value={rt.value}>
              {rt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showStatus ? (
        <Select value={value.status} onValueChange={(status) => onChange({ ...value, status })}>
          <SelectTrigger className="w-[170px] border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
