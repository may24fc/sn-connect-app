'use client';

import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../primitives/tooltip';

interface SectionTooltipProps {
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function SectionTooltip({ content, side = 'top' }: SectionTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info className="h-4 w-4" />
            <span className="sr-only">Info</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-[260px]">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
