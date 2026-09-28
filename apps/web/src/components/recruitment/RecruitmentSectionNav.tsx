'use client';

import { cn } from '@/lib/utils';
import { Archive, ArrowLeft, BriefcaseBusiness, LayoutDashboard, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type RecruitmentSection = 'overview' | 'postings' | 'applications' | 'archive';

interface RecruitmentSectionNavProps {
  current: RecruitmentSection;
  className?: string;
}

export function RecruitmentSectionNav({ current, className }: RecruitmentSectionNavProps) {
  const pathname = usePathname();
  const basePath = pathname.startsWith('/ats') ? '/ats' : '/admin';
  const sections = [
    {
      id: 'overview' as const,
      label: current === 'overview' ? 'Overview' : 'Back to overview',
      href: `${basePath}/recruitment`,
      icon: current === 'overview' ? LayoutDashboard : ArrowLeft,
    },
    {
      id: 'postings' as const,
      label: 'Job postings',
      href: `${basePath}/jobs`,
      icon: BriefcaseBusiness,
    },
    {
      id: 'applications' as const,
      label: 'Applications',
      href: `${basePath}/jobs/applications`,
      icon: Users,
    },
    {
      id: 'archive' as const,
      label: 'Archive',
      href: `${basePath}/jobs/archive`,
      icon: Archive,
    },
  ];

  return (
    <nav
      aria-label="Recruitment sections"
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
