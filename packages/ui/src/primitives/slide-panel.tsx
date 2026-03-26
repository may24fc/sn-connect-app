'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * SlidePanel — A ClickUp-inspired slide-from-right overlay panel.
 *
 * Built on top of Radix Dialog for accessibility (focus trap, Esc to close,
 * overlay click to close). Slides in from the right edge of the viewport
 * with a smooth cubic-bezier animation.
 *
 * Usage:
 * ```tsx
 * <SlidePanel open={open} onOpenChange={setOpen}>
 *   <SlidePanelHeader>
 *     <SlidePanelTitle>Create Objective</SlidePanelTitle>
 *     <SlidePanelDescription>Fill in the details below</SlidePanelDescription>
 *   </SlidePanelHeader>
 *   <SlidePanelBody>
 *     {/* form fields *\/}
 *   </SlidePanelBody>
 *   <SlidePanelFooter>
 *     <Button>Submit</Button>
 *   </SlidePanelFooter>
 * </SlidePanel>
 * ```
 */

// ─── Root ────────────────────────────────────────────────────────────────────
const SlidePanel = DialogPrimitive.Root;

// ─── Trigger ─────────────────────────────────────────────────────────────────
const SlidePanelTrigger = DialogPrimitive.Trigger;

// ─── Close ───────────────────────────────────────────────────────────────────
const SlidePanelClose = DialogPrimitive.Close;

// ─── Overlay ─────────────────────────────────────────────────────────────────
const SlidePanelOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]',
      'data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out',
      className
    )}
    {...props}
  />
));
SlidePanelOverlay.displayName = 'SlidePanelOverlay';

// ─── Content ─────────────────────────────────────────────────────────────────
interface SlidePanelContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Width of the panel. Defaults to max-w-xl (576px). */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' | 'responsive';
}

const sizeMap: Record<NonNullable<SlidePanelContentProps['size']>, string> = {
  sm: 'max-w-sm', // 384px
  md: 'max-w-md', // 448px
  lg: 'max-w-lg', // 512px
  xl: 'max-w-xl', // 576px
  '2xl': 'max-w-2xl', // 672px
  '3xl': 'max-w-3xl', // 768px
  full: 'max-w-[calc(100vw-2rem)]',
  responsive: 'w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl',
};

const SlidePanelContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SlidePanelContentProps
>(({ className, children, size = 'xl', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SlidePanelOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Layout: pinned to right, full height
        'fixed inset-y-0 right-0 z-50 flex w-full flex-col',
        sizeMap[size],
        // Styling
        'border-l border-border bg-background shadow-sheet',
        // Animation
        'data-[state=open]:animate-slide-in-right data-[state=closed]:animate-slide-out-right',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SlidePanelContent.displayName = 'SlidePanelContent';

// ─── Header ──────────────────────────────────────────────────────────────────
const SlidePanelHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col gap-1.5 border-b border-zinc-200 px-6 py-5 dark:border-zinc-800',
      className
    )}
    {...props}
  />
));
SlidePanelHeader.displayName = 'SlidePanelHeader';

// ─── Title ───────────────────────────────────────────────────────────────────
const SlidePanelTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50', className)}
    {...props}
  />
));
SlidePanelTitle.displayName = 'SlidePanelTitle';

// ─── Description ─────────────────────────────────────────────────────────────
const SlidePanelDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-zinc-500 dark:text-zinc-400', className)}
    {...props}
  />
));
SlidePanelDescription.displayName = 'SlidePanelDescription';

// ─── Body (scrollable) ──────────────────────────────────────────────────────
const SlidePanelBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex-1 overflow-y-auto px-6 py-5', className)}
    {...props}
  />
));
SlidePanelBody.displayName = 'SlidePanelBody';

// ─── Footer ──────────────────────────────────────────────────────────────────
const SlidePanelFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800',
      className
    )}
    {...props}
  />
));
SlidePanelFooter.displayName = 'SlidePanelFooter';

// ─── Section Label (for grouping form fields) ───────────────────────────────
const SlidePanelSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { label?: string }
>(({ className, label, children, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-3', className)} {...props}>
    {label && (
      <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
        {label}
      </h3>
    )}
    {children}
  </div>
));
SlidePanelSection.displayName = 'SlidePanelSection';

export {
  SlidePanel,
  SlidePanelTrigger,
  SlidePanelClose,
  SlidePanelOverlay,
  SlidePanelContent,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelDescription,
  SlidePanelBody,
  SlidePanelFooter,
  SlidePanelSection,
  type SlidePanelContentProps,
};
