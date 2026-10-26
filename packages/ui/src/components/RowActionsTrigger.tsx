'use client';

import { MoreHorizontal } from 'lucide-react';
import * as React from 'react';
import { Button, type ButtonProps } from '../primitives/button';

export interface RowActionsTriggerProps extends Omit<ButtonProps, 'children' | 'size' | 'variant'> {
  /** Accessible name, e.g. "Actions for Jane Doe". */
  label?: string;
}

/**
 * Standard "more actions" trigger for table rows and cards. Wrap it in
 * `DropdownMenuTrigger asChild` so every row menu has the same size, icon and variant.
 */
export const RowActionsTrigger = React.forwardRef<HTMLButtonElement, RowActionsTriggerProps>(
  ({ label = 'Row actions', ...props }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      {...props}
    >
      <MoreHorizontal strokeWidth={1.5} aria-hidden />
    </Button>
  )
);
RowActionsTrigger.displayName = 'RowActionsTrigger';
