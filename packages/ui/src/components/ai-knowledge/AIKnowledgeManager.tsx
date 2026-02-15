'use client';

import * as React from 'react';
import type { KnowledgeSource } from '../../types/ai-knowledge.types';
import { cn } from '../../utils/cn';
import { KnowledgeBasePanel } from './KnowledgeBasePanel';
import { PlaygroundPanel } from './PlaygroundPanel';
import { mockSources } from './mockData';

export interface AIKnowledgeManagerProps {
  className?: string;
}

type PanelState = 'both' | 'knowledge' | 'playground';

export function AIKnowledgeManager({ className }: AIKnowledgeManagerProps): React.ReactNode {
  const [sources, setSources] = React.useState<Array<KnowledgeSource>>(mockSources);
  const [debugMode, setDebugMode] = React.useState(false);
  const [panelState] = React.useState<PanelState>('both');

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
            <KnowledgeBasePanel sources={sources} onSourcesChange={setSources} className="flex-1" />
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
