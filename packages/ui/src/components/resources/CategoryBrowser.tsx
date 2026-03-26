import type * as React from 'react';
import { cn } from '../../utils/cn';
import type { ResourceCategory } from './ResourceCard';

export interface CategoryItem {
  value: ResourceCategory;
  label: string;
  description?: string;
  count?: number;
}

export interface CategoryBrowserProps {
  categories: Array<CategoryItem>;
  selectedCategory?: string;
  onSelect: (category: ResourceCategory) => void;
}

export function CategoryBrowser({
  categories,
  selectedCategory,
  onSelect,
}: CategoryBrowserProps): React.ReactNode {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.value;

        return (
          <button
            key={cat.value}
            type="button"
            onClick={() => onSelect(cat.value)}
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-colors cursor-pointer',
              isSelected
                ? 'bg-zinc-900 border-zinc-600 text-white dark:bg-zinc-800 dark:border-zinc-500'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
