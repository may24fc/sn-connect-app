import {
  BookOpen,
  Briefcase,
  FileCheck,
  GraduationCap,
  Heart,
  type LucideIcon,
  Shield,
  Sparkles,
  Target,
  Users,
  Wrench,
} from 'lucide-react';
import type * as React from 'react';
import { Card, CardContent } from '../../primitives/card';
import { cn } from '../../utils/cn';
import type { ResourceCategory } from './ResourceCard';

export interface CategoryItem {
  value: ResourceCategory;
  label: string;
  description: string;
  count?: number;
}

export interface CategoryBrowserProps {
  categories: Array<CategoryItem>;
  selectedCategory?: string;
  onSelect: (category: ResourceCategory) => void;
}

const categoryIcons: Record<ResourceCategory, LucideIcon> = {
  onboarding: GraduationCap,
  training: BookOpen,
  policies: FileCheck,
  benefits: Heart,
  tools: Wrench,
  culture: Sparkles,
  department_specific: Users,
  forms_templates: Briefcase,
  performance: Target,
  emergency: Shield,
};

export function CategoryBrowser({
  categories,
  selectedCategory,
  onSelect,
}: CategoryBrowserProps): React.ReactNode {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {categories.map((cat) => {
        const Icon = categoryIcons[cat.value];
        const isSelected = selectedCategory === cat.value;

        return (
          <Card
            key={cat.value}
            onClick={() => onSelect(cat.value)}
            className={cn(
              'cursor-pointer border rounded-lg p-4 transition-colors text-center',
              isSelected
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
            )}
          >
            <CardContent className="p-0 flex flex-col items-center gap-2">
              <Icon
                className={cn(
                  'h-6 w-6',
                  isSelected
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-400 dark:text-zinc-500'
                )}
                strokeWidth={1.5}
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  isSelected
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-700 dark:text-zinc-300'
                )}
              >
                {cat.label}
              </span>
              {cat.count !== undefined ? (
                <span className="text-[10px] text-zinc-400">{cat.count} resources</span>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
