'use client';

import * as React from 'react';
import type { AccessLevel, FileStatus, KnowledgeSource } from '../../types/ai-knowledge.types';
import { cn } from '../../utils/cn';
import type { ChatInterfaceMessage } from './ChatInterface';
import { KnowledgeBasePanel } from './KnowledgeBasePanel';
import { PlaygroundPanel } from './PlaygroundPanel';

export interface AIKnowledgeManagerProps {
  className?: string;

  // --- Knowledge Base (sources) API integration ---
  /** External sources loaded from the API */
  sources?: Array<KnowledgeSource>;
  /** Whether sources are loading from the API */
  isSourcesLoading?: boolean;
  /** Called when files are selected for upload */
  onUploadFiles?: (files: Array<File>) => void;
  /** Called when a source's access level changes */
  onAccessChange?: (sourceId: string, accessLevel: AccessLevel) => void;
  /** Called when a source is deleted */
  onDeleteSource?: (sourceId: string) => void;
  /** Upload state for files being processed */
  uploadingFiles?: Array<{ id: string; fileName: string; stage: FileStatus }>;

  // --- Chat / Playground API integration ---
  /** External chat messages from useAIChat hook */
  chatMessages?: Array<ChatInterfaceMessage>;
  /** External send handler from useAIChat hook */
  onSendChatMessage?: (content: string) => Promise<void>;
  /** Chat loading state */
  isChatLoading?: boolean;
  /** Chat error */
  chatError?: string | null;
  /** Called to abort an in-flight chat request */
  onAbortChat?: () => void;
}

type PanelState = 'both' | 'knowledge' | 'playground';

export function AIKnowledgeManager({
  className,
  sources: externalSources,
  isSourcesLoading,
  onUploadFiles,
  onAccessChange,
  onDeleteSource,
  uploadingFiles,
  chatMessages,
  onSendChatMessage,
  isChatLoading,
  chatError,
  onAbortChat,
}: AIKnowledgeManagerProps): React.ReactNode {
  const [internalSources, setInternalSources] = React.useState<Array<KnowledgeSource>>([]);
  const [debugMode, setDebugMode] = React.useState(false);
  const [panelState] = React.useState<PanelState>('both');

  const sources = externalSources ?? internalSources;

  const showKnowledge = panelState === 'both' || panelState === 'knowledge';
  const showPlayground = panelState === 'both' || panelState === 'playground';

  return (
    <div className={cn('bg-card rounded-lg border text-foreground flex flex-col', className)}>
      <div className="flex flex-1 min-h-0">
        {/* Left Panel - Knowledge Base */}
        {showKnowledge && (
          <div
            className={cn(
              'border-r border-border flex flex-col relative min-h-0',
              panelState === 'both' && 'w-[55%]',
              panelState === 'knowledge' && 'w-full'
            )}
          >
            <KnowledgeBasePanel
              sources={sources}
              onSourcesChange={externalSources ? () => {} : setInternalSources}
              {...(onUploadFiles !== undefined && { onUploadFiles })}
              {...(onAccessChange !== undefined && { onAccessChange })}
              {...(onDeleteSource !== undefined && { onDeleteSource })}
              {...(isSourcesLoading !== undefined && { isLoading: isSourcesLoading })}
              {...(uploadingFiles !== undefined && { uploadingFiles })}
              className="flex-1"
            />
          </div>
        )}

        {/* Right Panel - Agent Simulator */}
        {showPlayground && (
          <div
            className={cn(
              'flex flex-col relative min-h-0',
              panelState === 'both' && 'w-[45%]',
              panelState === 'playground' && 'w-full'
            )}
          >
            <PlaygroundPanel
              debugMode={debugMode}
              onDebugModeChange={setDebugMode}
              {...(chatMessages !== undefined && { messages: chatMessages })}
              {...(onSendChatMessage !== undefined && { onSendMessage: onSendChatMessage })}
              {...(isChatLoading !== undefined && { isLoading: isChatLoading })}
              {...(chatError !== undefined && { error: chatError })}
              {...(onAbortChat !== undefined && { onAbort: onAbortChat })}
              className="flex-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}
