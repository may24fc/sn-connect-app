'use client';

import { cn } from '@/lib/utils';
import { FolderKanban, Handshake, LayoutDashboard, ListTodo } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type WorkTrackerSection = 'overview' | 'projects' | 'tasks' | 'requests';

interface WorkTrackerSectionNavProps {
  current: WorkTrackerSection;
  className?: string;
  pendingRequestCount?: number;
}

export function WorkTrackerSectionNav({
  current,
  className,
  pendingRequestCount = 0,
}: WorkTrackerSectionNavProps) {
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
    {
      id: 'requests' as const,
      label: 'Department Requests',
      icon: Handshake,
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
          section.id === 'overview'
            ? 'team'
            : section.id === 'projects'
              ? 'roadmap'
              : section.id === 'tasks'
                ? 'execution'
                : 'requests'
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
            {section.id === 'requests' && pendingRequestCount > 0 ? (
              <span className="rounded-full bg-primary px-1.5 text-[10px] leading-5 text-primary-foreground">
                {pendingRequestCount > 99 ? '99+' : pendingRequestCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
