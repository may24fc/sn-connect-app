'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';
import { cn } from '../utils/cn';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full cursor-pointer items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-offset-background transition-all',
      'hover:border-zinc-300 hover:bg-zinc-50/50',
      'focus:border-zinc-700 focus:ring-2 focus:ring-zinc-700/20 focus:ring-offset-0',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20',
      '[&>span]:line-clamp-1',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 dark:text-zinc-500" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1 text-zinc-400 dark:text-zinc-500',
      className
    )}
    {...props}
  >
    <ChevronUp className="h-3.5 w-3.5" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1 text-zinc-400 dark:text-zinc-500',
      className
    )}
    {...props}
  >
    <ChevronDown className="h-3.5 w-3.5" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', style, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 min-w-[8rem] overflow-hidden rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-xl shadow-zinc-200/60',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-none',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      position={position}
      style={{
        maxHeight: 'min(24rem, var(--radix-select-content-available-height))',
        ...style,
      }}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'max-h-[inherit] overflow-y-auto overscroll-contain p-1.5',
          position === 'popper' &&
            'w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-xs font-semibold text-zinc-400 dark:text-zinc-500',
      className
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const EMPTY_SELECT_SENTINEL = '__hrportal_empty__';

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  // Ensure we never pass an explicit empty string as a Select item value.
  // Radix Select treats empty string as the clear sentinel, which causes the runtime error
  // when consumers accidentally render an item with value="". Substitute a sentinel
  // value and keep the original in a data attribute for debugging.
  const { value, ...rest } = props as any;
  const safeValue = value === '' ? EMPTY_SELECT_SENTINEL : value;

  if (value === '') {
    // eslint-disable-next-line no-console
    console.warn(
      'SelectItem received an empty string `value` — substituting sentinel to avoid Radix error.'
    );
  }

  return (
    <SelectPrimitive.Item
      ref={ref}
      value={safeValue}
      data-original-value={value ?? undefined}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm text-zinc-700 outline-none transition-colors',
        'focus:bg-slate-50 focus:text-slate-900',
        'data-[state=checked]:bg-slate-900 data-[state=checked]:font-medium data-[state=checked]:text-white',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        'dark:text-zinc-300 dark:focus:bg-slate-800/50 dark:focus:text-slate-200',
        'dark:data-[state=checked]:bg-slate-700 dark:data-[state=checked]:text-white',
        className
      )}
      {...(rest as any)}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-3.5 w-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1.5 h-px bg-zinc-100 dark:bg-zinc-800', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
