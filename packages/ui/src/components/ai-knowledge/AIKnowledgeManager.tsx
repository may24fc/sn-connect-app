'use client';

import * as React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../../primitives/button';
import { cn } from '../../utils/cn';
import { KnowledgeBasePanel } from './KnowledgeBasePanel';
import { PlaygroundPanel } from './PlaygroundPanel';
import { mockSources } from './mockData';
import type { KnowledgeSource } from '../../types/ai-knowledge.types';

export interface AIKnowledgeManagerProps {
  className?: string;
}

type PanelState = 'both' | 'knowledge' | 'playground';

export function AIKnowledgeManager({
  className,
}: AIKnowledgeManagerProps): React.ReactNode {
  const [sources, setSources] = React.useState<KnowledgeSource[]>(mockSources);
  const [debugMode, setDebugMode] = React.useState(false);
  const [panelState, setPanelState] = React.useState<PanelState>('both');

  const handleToggleKnowledgePanel = (): void => {
    setPanelState((current) => {
      if (current === 'both') return 'playground';
      if (current === 'playground') return 'both';
      return 'playground';
    });
  };

  const handleTogglePlaygroundPanel = (): void => {
    setPanelState((current) => {
      if (current === 'both') return 'knowledge';
      if (current === 'knowledge') return 'both';
      return 'knowledge';
    });
  };

  const showKnowledge = panelState === 'both' || panelState === 'knowledge';
  const showPlayground = panelState === 'both' || panelState === 'playground';

  return (
    <div className={cn('bg-muted/30 rounded-lg border text-foreground', className)}>
      <div className="flex">
        {/* Left Panel - Knowledge Base */}
        {showKnowledge && (
          <div
            className={cn(
              'border-r border-border flex flex-col relative',
              panelState === 'both' && 'w-[55%]',
              panelState === 'knowledge' && 'w-full'
            )}
          >
            <KnowledgeBasePanel
              sources={sources}
              onSourcesChange={setSources}
              className="flex-1"
            />

          </div>
        )}

        {/* Right Panel - Agent Simulator */}
        {showPlayground && (
          <div
            className={cn(
              'flex flex-col relative',
              panelState === 'both' && 'w-[45%]',
              panelState === 'playground' && 'w-full'
            )}
          >
            <PlaygroundPanel
              debugMode={debugMode}
              onDebugModeChange={setDebugMode}
              className="flex-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}
