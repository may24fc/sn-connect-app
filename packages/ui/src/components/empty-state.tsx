'use client';

import type { LucideIcon } from 'lucide-react';
import { FileQuestion } from 'lucide-react';
import { createElement, isValidElement, type ElementType, type ReactNode } from 'react';
import { Button } from '../primitives/button';
import { cn } from '../utils/cn';

type EmptyStateAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: ReactNode;
};

export interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  size?: 'sm' | 'md' | 'lg';
  appearance?: 'default' | 'inverse';
  className?: string;
}

const appearanceClasses = {
  default: {
    icon: 'text-zinc-500 dark:text-zinc-400',
    title: 'text-zinc-900 dark:text-zinc-100',
    description: 'text-zinc-500 dark:text-zinc-400',
  },
  inverse: {
    icon: 'text-zinc-400',
    title: 'text-zinc-100',
    description: 'text-zinc-300',
  },
} as const;

const sizeClasses = {
  sm: {
    container: 'py-8',
    icon: 'h-5 w-5',
    title: 'text-sm',
    description: 'text-xs',
    button: 'sm' as const,
  },
  md: {
    container: 'py-12',
    icon: 'h-5 w-5',
    title: 'text-base',
    description: 'text-sm',
    button: 'default' as const,
  },
  lg: {
    container: 'py-16',
    icon: 'h-5 w-5',
    title: 'text-lg',
    description: 'text-base',
    button: 'default' as const,
  },
} as const;

function renderAction(
  action: EmptyStateAction,
  variant: 'default' | 'outline',
  size: 'sm' | 'default'
) {
  const content = (
    <>
      {action.icon ? <span>{action.icon}</span> : null}
      {action.label}
    </>
  );

  if (action.href) {
    return (
      <Button asChild variant={variant} size={size}>
        <a href={action.href}>{content}</a>
      </Button>
    );
  }

  return (
    <Button variant={variant} size={size} onClick={action.onClick}>
      {content}
    </Button>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  appearance = 'default',
  className,
}: EmptyStateProps) {
  const sizes = sizeClasses[size];
  const colors = appearanceClasses[appearance];
  const Icon = icon && !isValidElement(icon) ? (icon as ElementType | LucideIcon) : null;
  const customIcon = isValidElement(icon) ? icon : undefined;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      <div className={cn('mb-4', colors.icon)}>
        {Icon ? (
          createElement(Icon, { className: sizes.icon, strokeWidth: 1.5 })
        ) : customIcon ? (
          <span className={sizes.icon}>{customIcon}</span>
        ) : (
          <FileQuestion className={sizes.icon} strokeWidth={1.5} />
        )}
      </div>
      <h3 className={cn('mb-1 font-medium tracking-tight', colors.title, sizes.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn('mb-4 max-w-sm', colors.description, sizes.description)}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-2 flex items-center gap-3">
          {action ? renderAction(action, 'default', sizes.button) : null}
          {secondaryAction ? renderAction(secondaryAction, 'outline', sizes.button) : null}
        </div>
      )}
    </div>
  );
}
