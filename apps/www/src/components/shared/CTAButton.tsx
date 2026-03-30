import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CTAButtonProps {
  href?: string;
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'secondary';
  size?: 'default' | 'lg';
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}

const variants = {
  primary:
    'bg-primary-800 text-white font-medium hover:bg-primary-900 transition-colors',
  outline:
    'border border-accent-300 text-zinc-700 font-medium hover:border-primary-300 hover:bg-primary-50 hover:text-primary-900 transition-colors',
  secondary:
    'bg-primary-50 text-primary-900 font-medium hover:bg-primary-100 transition-colors',
};

const sizes = {
  default: 'px-5 py-2.5 text-sm rounded-lg',
  lg: 'px-6 py-3 text-sm rounded-lg',
};

export function CTAButton({
  href,
  children,
  variant = 'primary',
  size = 'default',
  className,
  type = 'button',
  disabled = false,
  onClick,
}: CTAButtonProps): ReactNode {
  const classes = cn(
    'inline-flex items-center justify-center gap-2',
    variants[variant],
    sizes[size],
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
