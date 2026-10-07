'use client';

import type * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../primitives/avatar';
import { cn } from '../../utils/cn';

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<UserAvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

/**
 * Up to two initials from a display name. Blank or missing names return the fallback
 * rather than an empty string, so the avatar never renders as an empty circle.
 */
export function getUserInitials(name: string | null | undefined, fallback = '?'): string {
  const initials = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return initials || fallback;
}

export interface UserAvatarProps {
  name?: string | null | undefined;
  avatarUrl?: string | null | undefined;
  size?: UserAvatarSize;
  className?: string;
  fallbackClassName?: string;
}

/** A person's uploaded photo, falling back to their initials while loading or when none exists. */
export function UserAvatar({
  name,
  avatarUrl,
  size = 'sm',
  className,
  fallbackClassName,
}: UserAvatarProps): React.ReactElement {
  return (
    <Avatar className={cn(SIZE_CLASSES[size], className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name ?? ''} className="object-cover" /> : null}
      <AvatarFallback className={cn('bg-primary/10 text-primary', fallbackClassName)}>
        {getUserInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** "super_admin" → "Super Admin". Returns null for missing roles so PersonMeta skips them. */
export function formatPersonRole(role: string | null | undefined): string | null {
  const normalized = (role ?? '').trim();
  if (!normalized) {
    return null;
  }

  return normalized
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export interface PersonMetaProps {
  /** Missing, blank, and placeholder ('—', '-', 'Unassigned') values are skipped along with their separator. */
  parts: Array<string | null | undefined | false>;
  separator?: string;
  className?: string;
}

// 'Unassigned' is the stored "no department" placeholder (employees.department is NOT NULL).
const PLACEHOLDER_VALUES = new Set(['—', '–', '-', 'Unassigned']);

export function getPersonMetaParts(parts: PersonMetaProps['parts']): Array<string> {
  return parts
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part !== '' && !PLACEHOLDER_VALUES.has(part));
}

/** A secondary line such as "Marketing · Associate" that never renders a dangling separator. */
export function PersonMeta({
  parts,
  separator = '·',
  className,
}: PersonMetaProps): React.ReactElement | null {
  const visible = getPersonMetaParts(parts);

  if (visible.length === 0) {
    return null;
  }

  return (
    <span className={cn('truncate text-xs text-muted-foreground', className)}>
      {visible.join(` ${separator} `)}
    </span>
  );
}

export interface PersonIdentityProps {
  name: string;
  avatarUrl?: string | null | undefined;
  meta?: PersonMetaProps['parts'];
  size?: UserAvatarSize;
  className?: string;
  nameClassName?: string;
}

/** Avatar beside a name and an optional meta line, for person rows in tables and lists. */
export function PersonIdentity({
  name,
  avatarUrl,
  meta,
  size = 'sm',
  className,
  nameClassName,
}: PersonIdentityProps): React.ReactElement {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <UserAvatar name={name} avatarUrl={avatarUrl} size={size} />
      <div className="flex min-w-0 flex-col">
        <span className={cn('truncate text-sm font-medium', nameClassName)}>{name}</span>
        {meta ? <PersonMeta parts={meta} /> : null}
      </div>
    </div>
  );
}
