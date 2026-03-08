import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
  light?: boolean;
}

export function SectionHeading({
  title,
  subtitle,
  centered = true,
  className,
  light = false,
}: SectionHeadingProps): ReactNode {
  return (
    <div className={cn(centered && 'text-center', className)}>
      <h2
        className={cn(
          'text-3xl font-bold tracking-tight sm:text-4xl',
          light ? 'text-white' : 'text-zinc-900'
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            'mx-auto mt-3 max-w-2xl text-lg',
            light ? 'text-zinc-300' : 'text-zinc-500'
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
