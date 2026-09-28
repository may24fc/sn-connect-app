'use client';

import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, FolderKanban, LayoutDashboard, ListTodo } from 'lucide-react';
import Link from 'next/link';

type WorkTrackerSection = 'overview' | 'projects' | 'tasks';

interface WorkTrackerSectionNavProps {
  current: WorkTrackerSection;
  className?: string;
}

export function WorkTrackerSectionNav({ current, className }: WorkTrackerSectionNavProps) {
  const { user } = useAuth();
  const projectsHref =
    user?.role === 'admin' || user?.role === 'super_admin' ? '/admin/war-room' : '/projects';
  const tasksHref = user?.role === 'super_admin' ? '/super-admin/tasks' : '/tasks';

  const sections = [
    {
      id: 'overview' as const,
      label: current === 'overview' ? 'Overview' : 'Back to overview',
      href: '/work-tracker',
      icon: current === 'overview' ? LayoutDashboard : ArrowLeft,
    },
    {
      id: 'projects' as const,
      label: 'Projects',
      href: projectsHref,
      icon: FolderKanban,
    },
    {
      id: 'tasks' as const,
      label: 'Tasks',
      href: tasksHref,
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

        return (
          <Link
            key={section.id}
            href={section.href}
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
