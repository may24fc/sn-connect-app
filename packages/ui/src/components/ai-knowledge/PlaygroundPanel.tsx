'use client';

import * as React from 'react';
import { cn } from '../../utils/cn';
import { Label } from '../../primitives/label';
import { ChatInterface } from './ChatInterface';

export interface PlaygroundPanelProps {
  debugMode: boolean;
  onDebugModeChange: (enabled: boolean) => void;
  className?: string;
}

export function PlaygroundPanel({
  debugMode,
  onDebugModeChange,
  className,
}: PlaygroundPanelProps): React.ReactNode {
  return (
    <div className={cn('flex flex-col h-full bg-background rounded-lg', className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-md font-semibold text-foreground">Agent Simulator</h2>
          </div>

          {/* Debug Mode Toggle */}
          <div className="flex items-center gap-3">
            <Label
              htmlFor="debug-mode"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Debug Mode
            </Label>
            <button
              id="debug-mode"
              role="switch"
              aria-checked={debugMode}
              onClick={() => onDebugModeChange(!debugMode)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                debugMode ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
                  debugMode ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>

        {debugMode && (
          <p className="text-xs text-primary mt-3 bg-primary/10 rounded-lg px-3 py-2 border border-primary/20">
            Debug mode enabled: Source attributions will be shown for AI responses
          </p>
        )}
      </div>

      {/* Chat Interface */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatInterface debugMode={debugMode} className="h-full" />
      </div>
    </div>
  );
}
