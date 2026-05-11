'use client';

import type * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../primitives/avatar';
import { cn } from '../../utils/cn';

export interface ContributorAvatar {
  userId: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface ContributorAvatarStackProps {
  contributors: ContributorAvatar[];
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function ContributorAvatarStack({
  contributors,
  max = 4,
  size = 'sm',
  className,
}: ContributorAvatarStackProps): React.ReactElement {
  const visible = contributors.slice(0, max);
  const overflow = contributors.length - visible.length;
  const sizeClass = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visible.map((c) => (
        <Avatar
          key={c.userId}
          className={cn(
            'border-2 border-white ring-0 dark:border-zinc-900',
            sizeClass
          )}
        >
          {c.avatarUrl ? <AvatarImage src={c.avatarUrl} alt={c.name ?? ''} /> : null}
          <AvatarFallback className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {initials(c.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full border-2 border-white bg-zinc-100 font-medium text-zinc-600 dark:border-zinc-900 dark:bg-zinc-800 dark:text-zinc-300',
            sizeClass
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
