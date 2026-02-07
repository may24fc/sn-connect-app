'use client';

import * as React from 'react';
import { User, Bot } from 'lucide-react';
import { Avatar, AvatarFallback } from '../../primitives/avatar';
import { cn } from '../../utils/cn';
import { DebugPanel } from './DebugPanel';
import type { ChatMessage as ChatMessageType } from '../../types/ai-knowledge.types';

export interface ChatMessageProps {
  message: ChatMessageType;
  showDebug: boolean;
  className?: string;
}

export function ChatMessage({
  message,
  showDebug,
  className,
}: ChatMessageProps): React.ReactNode {
  const [isDebugExpanded, setIsDebugExpanded] = React.useState(false);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isUser = message.role === 'user';
  const hasSourceAttributions = message.sources && message.sources.length > 0;

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* Avatar */}
      <Avatar className="h-9 w-9 flex-shrink-0">
        <AvatarFallback
          className={cn(
            isUser
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground'
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          'flex-1 max-w-[85%] space-y-1.5',
          isUser && 'flex flex-col items-end'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-3',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-card border border-border text-foreground rounded-tl-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>

        <p
          className={cn(
            'text-xs text-muted-foreground/70 px-1',
            isUser && 'text-right'
          )}
        >
          {formatTime(message.timestamp)}
        </p>

        {/* Debug Panel for AI messages with sources */}
        {!isUser && showDebug && hasSourceAttributions && (
          <DebugPanel
            sources={message.sources!}
            isExpanded={isDebugExpanded}
            onToggle={() => setIsDebugExpanded(!isDebugExpanded)}
          />
        )}
      </div>
    </div>
  );
}
