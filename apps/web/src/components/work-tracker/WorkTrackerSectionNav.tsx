'use client';

import { cn } from '@/lib/utils';
import { FolderKanban, LayoutDashboard, ListTodo } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type WorkTrackerSection = 'overview' | 'projects' | 'tasks';

interface WorkTrackerSectionNavProps {
  current: WorkTrackerSection;
  className?: string;
}

export function WorkTrackerSectionNav({ current, className }: WorkTrackerSectionNavProps) {
  const searchParams = useSearchParams();
  const sections = [
    {
      id: 'overview' as const,
      label: 'Team Workload',
      icon: LayoutDashboard,
    },
    {
      id: 'projects' as const,
      label: 'Project Roadmap',
      icon: FolderKanban,
    },
    {
      id: 'tasks' as const,
      label: 'Execution Board',
      icon: ListTodo,
    },
  ];

  return (
    <nav
      aria-label="Work Tracker sections"
      className={cn(
        'flex w-fit max-w-full flex-wrap gap-1 rounded-lg border bg-muted/40 p-1',
        className
      )}
    >
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = section.id === current;
        const params = new URLSearchParams(searchParams.toString());
        params.set(
          'view',
          section.id === 'overview' ? 'team' : section.id === 'projects' ? 'roadmap' : 'execution'
        );

        return (
          <Link
            key={section.id}
            href={`/work-tracker?${params.toString()}`}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
