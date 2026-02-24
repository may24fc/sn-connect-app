'use client';

import { AlertCircle, Bot, Loader2, Send, StopCircle } from 'lucide-react';
import * as React from 'react';
import { Avatar, AvatarFallback } from '../../primitives/avatar';
import { Button } from '../../primitives/button';
import { Textarea } from '../../primitives/textarea';
import type {
  ChatMessage as ChatMessageType,
  SourceAttribution,
} from '../../types/ai-knowledge.types';
import { cn } from '../../utils/cn';
import { ChatMessage } from './ChatMessage';

export interface ChatInterfaceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<SourceAttribution>;
  isStreaming?: boolean;
}

export interface ChatInterfaceProps {
  debugMode: boolean;
  /** External messages (from useAIChat hook). Falls back to internal mock state when undefined. */
  messages?: Array<ChatInterfaceMessage>;
  /** External send handler (from useAIChat hook) */
  onSendMessage?: (content: string) => Promise<void>;
  /** External loading state */
  isLoading?: boolean;
  /** External error */
  error?: string | null;
  /** Called to abort an in-flight request */
  onAbort?: () => void;
  className?: string;
}

export function ChatInterface({
  debugMode,
  messages: externalMessages,
  onSendMessage,
  isLoading: externalIsLoading,
  error,
  onAbort,
  className,
}: ChatInterfaceProps): React.ReactNode {
  // Internal state for standalone/mock mode
  const [internalMessages, setInternalMessages] = React.useState<Array<ChatMessageType>>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hello! I'm the HR Agent simulator. Ask me anything about HR policies, and I'll respond using the knowledge base documents you've uploaded.",
      timestamp: new Date(),
    },
  ]);
  const [internalIsLoading, setInternalIsLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const isControlled = externalMessages !== undefined;
  const messages = isControlled ? externalMessages : internalMessages;
  const isLoading = isControlled ? (externalIsLoading ?? false) : internalIsLoading;

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (): Promise<void> => {
    if (!inputValue.trim() || isLoading) return;

    const value = inputValue.trim();
    setInputValue('');

    if (onSendMessage) {
      await onSendMessage(value);
    } else {
      // Fallback mock behavior
      const userMessage: ChatMessageType = {
        id: Date.now().toString(),
        role: 'user',
        content: value,
        timestamp: new Date(),
      };

      setInternalMessages((prev) => [...prev, userMessage]);
      setInternalIsLoading(true);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const assistantMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "I'm here to help you with HR-related questions. I can provide information about time off policies, remote work guidelines, employee benefits, company policies, onboarding, and training resources.",
        timestamp: new Date(),
      };

      setInternalMessages((prev) => [...prev, assistantMessage]);
      setInternalIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Determine if the last message is streaming
  const lastMessage = messages[messages.length - 1];
  const isStreaming =
    lastMessage?.role === 'assistant' && (lastMessage as ChatInterfaceMessage).isStreaming;

  return (
    <div className={cn('flex flex-col h-full overflow-hidden bg-muted/20', className)}>
      {/* Error Banner */}
      {error && (
        <div className="flex-shrink-0 mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Messages Area - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
        {messages.map((message) => {
          // Convert to ChatMessageType for the ChatMessage component
          const chatMsg: ChatMessageType = {
            id: message.id,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp,
            ...(message.sources !== undefined && { sources: message.sources }),
          };
          return <ChatMessage key={message.id} message={chatMsg} showDebug={debugMode} />;
        })}

        {/* Loading indicator (only when no streaming message visible) */}
        {isLoading && !isStreaming && (
          <div className="flex gap-3">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}

        {/* Streaming cursor indicator */}
        {isStreaming && lastMessage?.content && (
          <div className="flex items-center gap-2 px-1">
            <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Generating response...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-border px-6 py-4 bg-background">
        <div className="flex gap-3">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the HR Agent a question..."
            disabled={isLoading}
            className="min-h-[44px] max-h-28 resize-none text-sm py-3 rounded-xl border-border/60 focus:border-primary/40"
            rows={1}
            aria-label="Type your message"
          />
          {isStreaming && onAbort ? (
            <Button
              type="button"
              onClick={onAbort}
              variant="outline"
              size="icon"
              className="h-11 w-11 flex-shrink-0 rounded-xl border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              aria-label="Stop generating"
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="h-11 w-11 flex-shrink-0 rounded-xl"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground/70 text-center">
          Press{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground font-mono text-[10px]">
            Enter
          </kbd>{' '}
          to send,{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground font-mono text-[10px]">
            Shift + Enter
          </kbd>{' '}
          for new line
        </p>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
      `}</style>
    </div>
  );
}
