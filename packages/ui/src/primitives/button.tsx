'use client';

import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-px',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-[rgb(var(--primary-hover))] active:bg-[rgb(var(--primary-active))]',
        destructive: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800',
        outline:
          'border border-input bg-card text-foreground shadow-sm hover:border-primary/35 hover:bg-primary-muted/55 hover:text-primary active:bg-primary-muted',
        secondary:
          'border border-border bg-secondary text-secondary-foreground shadow-sm hover:bg-primary-muted active:bg-primary-muted/80',
        ghost:
          'text-muted-foreground hover:bg-primary-muted/70 hover:text-primary active:bg-primary-muted',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800',
        warning: 'bg-amber-500 text-white shadow-sm hover:bg-amber-600 active:bg-amber-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        xs: 'h-7 rounded-md px-2 text-[0.75rem] leading-4',
        sm: 'h-8 rounded-md px-3 text-[0.75rem] leading-4 lg:text-[0.8125rem]',
        lg: 'h-12 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
