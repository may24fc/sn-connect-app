'use client';

import { Construction } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../primitives/dialog';
import { Button } from '../../primitives/button';

interface ComingSoonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string | undefined;
}

export function ComingSoonDialog({
  open,
  onOpenChange,
  featureName,
}: ComingSoonDialogProps): ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/50 mb-2">
            <Construction className="h-6 w-6 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
          </div>
          <DialogTitle>Coming Soon!</DialogTitle>
          <DialogDescription>
            {featureName
              ? `${featureName} is currently under development and will be available soon.`
              : 'This feature is coming soon!'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
