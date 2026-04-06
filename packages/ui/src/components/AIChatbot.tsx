'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Maximize2, Minimize2, MoreHorizontal, PanelLeft, Pencil, Plus, Sparkles, Trash2, User, X } from 'lucide-react';
import * as React from 'react';
import { Avatar, AvatarFallback } from '../primitives/avatar';
import { Button } from '../primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../primitives/dropdown-menu';
import { cn } from '../utils/cn';
import { MarkdownContent } from '../utils/markdown';
import { ChatInput, type AttachedFile } from './ai-chat/ChatInput';
import { TextShimmer } from './ai-chat/TextShimmer';
import { CitedContent } from './ai-chat/CitedContent';
import { CitationPanel } from './ai-chat/CitationPanel';
import type { Citation } from './ai-chat/citation-utils';



export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  /** Citations for assistant messages */
  citations?: Citation[];
}

interface Conversation {
  id: string;
  title: string;
  messages: Array<ChatMessage>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationItem {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIChatSuggestion {
  id: string;
  label: string;
  prompt: string;
}

export interface AIChatbotLiveSync {
  hasSyncedGoogleDocs: boolean;
  syncedDocumentCount?: number;
  lastSyncedAt?: string | null;
  lastSyncedTitle?: string | null;
}

export interface AIChatbotProps {
  /** Legacy: simple request/response handler (fallback if no streaming props given). */
  onSendMessage?: (message: string) => Promise<string>;
  /** Streaming mode: externally-managed messages array. */
  messages?: Array<ChatMessage>;
  /** Streaming mode: send a message through the streaming pipeline. */
  onStreamMessage?: (content: string) => Promise<void>;
  /** Streaming mode: is the assistant currently streaming / loading? */
  isStreamLoading?: boolean;
  /** Streaming mode: abort current stream. */
  onAbort?: () => void;
  /** Streaming mode: clear chat history. */
  onClearHistory?: () => void;
  /** Persistent conversations list (from DB). */
  conversations?: Array<ConversationItem>;
  /** Currently active conversation ID. */
  activeConversationId?: string | null;
  /** Callback when user selects a conversation. */
  onSelectConversation?: (id: string) => void;
  /** Callback when user creates a new conversation. */
  onCreateConversation?: () => void;
  /** Callback when user renames a conversation. */
  onRenameConversation?: (id: string, title: string) => void;
  /** Callback when user deletes a conversation. */
  onDeleteConversation?: (id: string) => void;
  suggestions?: Array<AIChatSuggestion>;
  isSuggestionsLoading?: boolean;
  liveSync?: AIChatbotLiveSync | null;
  onOpenChange?: (open: boolean) => void;
  onSuggestionSelect?: (suggestion: AIChatSuggestion) => void;
  welcomeMessage?: string;
  placeholder?: string;
  className?: string;
}

const defaultWelcomeMessage = `Hi! I'm SN Connect AI. I can help you with:

- Employee policies and procedures
- Payroll questions
- Benefits information
- Onboarding tasks

How can I assist you today?`;

function makeWelcomeConversation(welcomeMessage: string): Conversation {
  return {
    id: '1',
    title: 'New conversation',
    messages: [
      {
        id: '1',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function groupConversationsByDate(conversations: Array<Conversation>): {
  today: Array<Conversation>;
  yesterday: Array<Conversation>;
  older: Array<Conversation>;
} {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  return {
    today: conversations.filter((c) => c.updatedAt >= todayStart),
    yesterday: conversations.filter(
      (c) => c.updatedAt >= yesterdayStart && c.updatedAt < todayStart
    ),
    older: conversations.filter((c) => c.updatedAt < yesterdayStart),
  };
}

export function AIChatbot({
  onSendMessage,
  messages: externalMessages,
  onStreamMessage,
  isStreamLoading,
  onAbort,
  onClearHistory,
  conversations: externalConversations,
  activeConversationId: externalActiveConversationId,
  onSelectConversation,
  onCreateConversation,
  onRenameConversation,
  onDeleteConversation,
  suggestions = [],
  isSuggestionsLoading = false,
  liveSync = null,
  onOpenChange,
  onSuggestionSelect,
  welcomeMessage = defaultWelcomeMessage,
  placeholder = 'Ask me anything about HR...',
  className,
}: AIChatbotProps): React.ReactNode {
  // Determine if we're in streaming mode (externally managed messages)
  const isStreamingMode = !!(externalMessages && onStreamMessage);
  // Determine if persistence mode is active (externally managed conversations)
  const isPersistenceMode = !!(externalConversations && onSelectConversation);

  const [isOpen, setIsOpen] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(true);
  const [conversations, setConversations] = React.useState<Array<Conversation>>([
    makeWelcomeConversation(welcomeMessage),
  ]);
  const [activeConversationId, setActiveConversationId] = React.useState('1');
  const [isLoading, setIsLoading] = React.useState(false);
  const [citationPanelOpen, setCitationPanelOpen] = React.useState(false);
  const [highlightedCitationId, setHighlightedCitationId] = React.useState<number | undefined>();
  const [activeCitations, setActiveCitations] = React.useState<Citation[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // In streaming mode, use external messages; otherwise use internal conversation state
  const welcomeMsg: ChatMessage = React.useMemo(() => ({
    id: 'welcome',
    role: 'assistant' as const,
    content: welcomeMessage,
    timestamp: new Date(),
  }), [welcomeMessage]);

  const messages = isStreamingMode
    ? (externalMessages.length > 0 ? externalMessages : [welcomeMsg])
    : (activeConversation?.messages ?? []);

  const currentIsLoading = isStreamingMode ? (isStreamLoading ?? false) : isLoading;

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-show history sidebar when entering fullscreen
  React.useEffect(() => {
    if (isFullscreen) setShowHistory(true);
  }, [isFullscreen]);

  const handleNewConversation = (): void => {
    if (isPersistenceMode && onCreateConversation) {
      onCreateConversation();
      return;
    }
    if (isStreamingMode && onClearHistory) {
      onClearHistory();
      return;
    }
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New conversation',
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const handleSelectConversation = (id: string): void => {
    if (isPersistenceMode && onSelectConversation) {
      onSelectConversation(id);
    } else {
      setActiveConversationId(id);
    }
  };

  const handleSendMessage = React.useCallback(async (messageContent?: string): Promise<void> => {
    const content = messageContent ?? '';
    if (!content.trim() || currentIsLoading) return;

    // Streaming mode — delegate to external handler
    if (isStreamingMode) {
      await onStreamMessage(content.trim());
      return;
    }

    // Legacy mode — internal state management
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // If this was still "New conversation", title it from first user message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConversationId) return c;
        return {
          ...c,
          title:
            c.title === 'New conversation'
              ? userMessage.content.slice(0, 48)
              : c.title,
          messages: [...c.messages, userMessage],
          updatedAt: new Date(),
        };
      })
    );

    setIsLoading(true);

    try {
      let response: string;

      if (onSendMessage) {
        response = await onSendMessage(userMessage.content);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        response = getSimulatedResponse(userMessage.content);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: new Date() }
            : c
        )
      );
    } catch (_error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          'I apologize, but I encountered an error. Please try again or contact IT support if the issue persists.',
        timestamp: new Date(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, messages: [...c.messages, errorMessage], updatedAt: new Date() }
            : c
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId, currentIsLoading, isStreamingMode, onSendMessage, onStreamMessage]);

  const handleCitationClick = (id: number, citations: Citation[]): void => {
    setActiveCitations(citations);
    setHighlightedCitationId(id);
    setCitationPanelOpen(true);
  };

  const handleChatInputSend = React.useCallback((data: { message: string; files: AttachedFile[] }) => {
    const content = data.message.trim();
    if (!content && data.files.length === 0) return;
    void handleSendMessage(content || 'Attached files');
  }, [handleSendMessage]);

  // Determine if we should show the welcome/empty state
  const isEmptyState = isStreamingMode
    ? externalMessages.length === 0
    : (activeConversation?.messages.length === 1 && activeConversation.messages[0]?.role === 'assistant');

  // Greeting based on time of day
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTime = (date: Date): string =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const formatGroupDate = (date: Date): string =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const grouped = isPersistenceMode
    ? groupConversationsByDate(
        externalConversations.map((c) => ({
          id: c.id,
          title: c.title,
          messages: [],
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }))
      )
    : groupConversationsByDate(conversations);

  const currentActiveId = isPersistenceMode ? (externalActiveConversationId ?? '') : activeConversationId;
  const shouldShowSuggestionButtons = isEmptyState && !currentIsLoading && suggestions.length > 0;
  const shouldRenderSuggestionArea =
    isEmptyState && (isSuggestionsLoading || suggestions.length > 0 || Boolean(liveSync?.hasSyncedGoogleDocs));

  const updateOpenState = (nextOpen: boolean): void => {
    setIsOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const formatRelativeSyncTime = (value?: string | null): string => {
    if (!value) return 'recently';

    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return 'recently';

    const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className={cn('relative', className)}>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 dark:bg-black/50 transition-opacity duration-300 ease-in-out',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => updateOpenState(false)}
        aria-hidden="true"
      />

      {/* Chat Panel */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-card',
          'border-zinc-200 dark:border-zinc-800',
          'transition-[transform,inset,width] duration-300 ease-in-out will-change-transform',
          isFullscreen
            ? 'inset-0 border-0'
            : 'inset-y-0 right-0 w-1/2 min-w-[360px] max-w-[720px] border-l',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-label="SN Connect AI Assistant"
        aria-hidden={!isOpen}
      >
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── History Sidebar ───────────────────────────────── */}
          <div
            className={cn(
              'flex flex-col flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-background',
              'transition-[width,opacity] duration-300 ease-in-out overflow-hidden',
              showHistory ? 'w-64 opacity-100' : 'w-0 opacity-0'
            )}
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 h-14 flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Conversations
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md"
                onClick={handleNewConversation}
                aria-label="New conversation"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'thin' }}>
              {grouped.today.length > 0 && (
                <ConversationGroup
                  label="Today"
                  conversations={grouped.today}
                  activeId={currentActiveId}
                  onSelect={handleSelectConversation}
                  onRename={onRenameConversation}
                  onDelete={onDeleteConversation}
                  formatDate={formatGroupDate}
                />
              )}
              {grouped.yesterday.length > 0 && (
                <ConversationGroup
                  label="Yesterday"
                  conversations={grouped.yesterday}
                  activeId={currentActiveId}
                  onSelect={handleSelectConversation}
                  onRename={onRenameConversation}
                  onDelete={onDeleteConversation}
                  formatDate={formatGroupDate}
                />
              )}
              {grouped.older.length > 0 && (
                <ConversationGroup
                  label="Recents"
                  conversations={grouped.older}
                  activeId={currentActiveId}
                  onSelect={handleSelectConversation}
                  onRename={onRenameConversation}
                  onDelete={onDeleteConversation}
                  formatDate={formatGroupDate}
                />
              )}
            </div>
          </div>

          {/* ── Chat Area ─────────────────────────────────────── */}
          <div className="flex flex-1 flex-col min-w-0">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 h-14 flex-shrink-0">
              <div className="flex items-center gap-2">
                {/* History toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8 transition-colors',
                    showHistory
                      ? 'text-zinc-700 bg-zinc-50 dark:bg-zinc-950/60'
                      : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  )}
                  onClick={() => setShowHistory((v) => !v)}
                  aria-label="Toggle conversation history"
                >
                  <PanelLeft className="h-4 w-4" strokeWidth={1.5} />
                </Button>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900/10 dark:bg-zinc-800/15">
                    <Sparkles className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                      SN Connect AI
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      HR Assistant · Powered by AI
                    </p>
                  </div>
                </div>
                {liveSync?.hasSyncedGoogleDocs && (
                  <div className="hidden min-[920px]:inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Docs synced {formatRelativeSyncTime(liveSync.lastSyncedAt)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* New Chat — visible when history is hidden */}
                {!showHistory && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={handleNewConversation}
                    aria-label="New conversation"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                )}
                {/* Fullscreen toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => setIsFullscreen((v) => !v)}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Maximize2 className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </Button>
                {/* Close */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => updateOpenState(false)}
                  aria-label="Close AI panel"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </div>
            </div>

            {isEmptyState ? (
              /* ── Welcome / Empty State ──────────────────────── */
              <div className="flex-1 flex flex-col items-center justify-center px-6">
                <div className={cn(isFullscreen && 'max-w-2xl', 'w-full flex flex-col items-center')}>
                  {/* Logo */}
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900/10 dark:bg-zinc-800/20 mb-5">
                    <Sparkles className="h-7 w-7 text-zinc-700 dark:text-zinc-400" strokeWidth={1.5} />
                  </div>

                  {/* Greeting */}
                  <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight mb-1.5">
                    {getGreeting()}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
                    How can I help you today?
                  </p>

                  <AnimatePresence initial={false}>
                    {shouldRenderSuggestionArea && (
                      <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                        className="mb-6 flex w-full max-w-2xl flex-col items-center gap-3"
                      >
                        {liveSync?.hasSyncedGoogleDocs && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ delay: 0.04, duration: 0.2 }}
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1.5 text-[11px] font-medium text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                          >
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>
                              Google Docs synced {formatRelativeSyncTime(liveSync.lastSyncedAt)}
                            </span>
                          </motion.div>
                        )}

                        {isSuggestionsLoading ? (
                          <div className="flex w-full max-w-2xl flex-wrap justify-center gap-2.5">
                            {Array.from({ length: 4 }).map((_, index) => (
                              <div
                                key={`suggestion-skeleton-${index + 1}`}
                                className="h-10 w-40 animate-pulse rounded-full border border-zinc-200/80 bg-white/70 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70"
                              />
                            ))}
                          </div>
                        ) : shouldShowSuggestionButtons ? (
                          <div className="flex w-full max-w-2xl flex-wrap justify-center gap-2.5">
                            {suggestions.map((suggestion, index) => (
                              <motion.button
                                key={suggestion.id}
                                type="button"
                                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                transition={{
                                  delay: 0.05 + index * 0.05,
                                  duration: 0.24,
                                  ease: [0.22, 1, 0.36, 1],
                                }}
                                whileHover={{ y: -3, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  onSuggestionSelect?.(suggestion);
                                  void handleSendMessage(suggestion.prompt);
                                }}
                                className="rounded-full border border-zinc-200/80 bg-white/85 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur transition-colors hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                              >
                                {suggestion.label}
                              </motion.button>
                            ))}
                          </div>
                        ) : null}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Chat Input */}
                  <ChatInput
                    onSendMessage={handleChatInputSend}
                    isLoading={currentIsLoading}
                    onAbort={isStreamingMode ? onAbort : undefined}
                    placeholder={placeholder}
                    autoFocus={isOpen}
                    className="w-full max-w-lg"
                  />

                  <p className="mt-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                    AI may make mistakes. Verify important information.
                  </p>
                </div>
              </div>
            ) : (
              /* ── Chat Messages + Input ──────────────────────── */
              <>
                {/* Messages */}
                <div
                  className={cn(
                    'flex-1 overflow-y-auto py-6 space-y-5',
                    isFullscreen ? 'px-8' : 'px-5'
                  )}
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(228 228 231) transparent' }}
                >
                  <div className={cn(isFullscreen && 'max-w-3xl mx-auto')}>
                    {messages.map((message) => {
                      if (message.role === 'assistant' && !message.content && message.isStreaming) {
                        return null;
                      }
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            'flex gap-3 mb-5',
                            message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                          )}
                        >
                          <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                            <AvatarFallback
                              className={cn(
                                message.role === 'assistant'
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                              )}
                            >
                              {message.role === 'assistant' ? (
                                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                              ) : (
                                <User className="h-3.5 w-3.5" strokeWidth={1.5} />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={cn(
                              'flex flex-1 min-w-0 flex-col gap-1',
                              message.role === 'user' ? 'items-end' : 'items-start'
                            )}
                          >
                            <div
                              className={cn(
                                'rounded-xl px-4 py-2.5',
                                isFullscreen ? 'max-w-[70%]' : 'max-w-[85%]',
                                message.role === 'user'
                                  ? 'bg-slate-900 text-white rounded-tr-sm'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-sm'
                              )}
                            >
                              {message.role === 'assistant' && message.citations && message.citations.length > 0 ? (
                                <CitedContent
                                  content={message.content}
                                  citations={message.citations}
                                  onCitationClick={(id) => handleCitationClick(id, message.citations ?? [])}
                                />
                              ) : message.role === 'assistant' ? (
                                <MarkdownContent content={message.content} />
                              ) : (
                                <p className="text-sm leading-relaxed">
                                  {message.content}
                                </p>
                              )}
                            </div>
                            {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveCitations(message.citations ?? []);
                                  setHighlightedCitationId(undefined);
                                  setCitationPanelOpen(true);
                                }}
                                className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-700 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                              >
                                <BookOpen className="h-3 w-3" />
                                View {message.citations.length} source{message.citations.length !== 1 ? 's' : ''}
                              </button>
                            )}
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {currentIsLoading && !messages.some((m) => m.role === 'assistant' && m.isStreaming && m.content) && (
                      <div className="flex gap-3 mb-5">
                        <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                          <AvatarFallback className="bg-slate-900 text-white">
                            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </AvatarFallback>
                        </Avatar>
                        <div className="rounded-xl rounded-tl-sm bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5">
                          <TextShimmer
                            as="span"
                            duration={1.8}
                            className="text-sm font-normal"
                          >
                            Generating response
                          </TextShimmer>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input */}
                <div
                  className={cn(
                    'border-t border-zinc-200 dark:border-zinc-800 py-3 flex-shrink-0',
                    isFullscreen ? 'px-8' : 'px-4'
                  )}
                >
                  <div className={cn(isFullscreen && 'max-w-3xl mx-auto')}>
                    <ChatInput
                      onSendMessage={handleChatInputSend}
                      isLoading={currentIsLoading}
                      onAbort={isStreamingMode ? onAbort : undefined}
                      placeholder={placeholder}
                      autoFocus={isOpen}
                    />
                    <p className="mt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                      AI may make mistakes. Verify important information.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Citation Panel (flex sibling) ─────────────────── */}
          <CitationPanel
            open={citationPanelOpen}
            onClose={() => setCitationPanelOpen(false)}
            citations={activeCitations}
            highlightedId={highlightedCitationId}
          />
        </div>
      </div>

      {/* Header Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => updateOpenState(!isOpen)}
        aria-label="Open AI Assistant"
        aria-expanded={isOpen}
        className={cn(
          'group relative h-9 w-9 transition-colors',
          isOpen
            ? 'bg-zinc-50 dark:bg-zinc-950/60 text-zinc-700'
            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200'
        )}
      >
        <Sparkles
          className={cn(
            'h-[18px] w-[18px] transition-colors',
            isOpen
              ? 'text-slate-700'
              : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200'
          )}
          strokeWidth={1.5}
        />
        {isOpen && (
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-slate-800" />
        )}
      </Button>
    </div>
  );
}

// ── History Sidebar sub-component ────────────────────────────────────────────

interface ConversationGroupProps {
  label: string;
  conversations: Array<Conversation>;
  activeId: string;
  onSelect: (id: string) => void;
  onRename?: ((id: string, title: string) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
  formatDate: (date: Date) => string;
}

function ConversationGroup({
  label,
  conversations,
  activeId,
  onSelect,
  onRename,
  onDelete,
  formatDate: _formatDate,
}: ConversationGroupProps): React.ReactNode {
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleRenameSubmit = (id: string): void => {
    const trimmed = renameValue.trim();
    if (trimmed && onRename) {
      onRename(id, trimmed);
    }
    setRenamingId(null);
  };

  return (
    <div className="mb-1">
      <p className="px-4 pt-4 pb-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={cn(
            'group flex items-center gap-1 px-2 mx-1 rounded-lg transition-colors',
            'hover:bg-zinc-200/60 dark:hover:bg-zinc-800',
            activeId === conv.id
              ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
              : 'text-zinc-700 dark:text-zinc-300'
          )}
          style={{ width: 'calc(100% - 8px)' }}
        >
          {renamingId === conv.id ? (
            <form
              className="flex-1 py-1 px-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleRenameSubmit(conv.id);
              }}
            >
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(conv.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-500 rounded px-2 py-1 text-xs outline-none"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => onSelect(conv.id)}
              className="flex-1 px-3 py-2.5 text-left min-w-0"
            >
              <p className="text-sm font-medium truncate leading-snug">{conv.title}</p>
            </button>
          )}

          {/* Actions dropdown — only show when rename/delete handlers are provided */}
          {(onRename || onDelete) && renamingId !== conv.id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {onRename && (
                  <DropdownMenuItem
                    onClick={() => {
                      setRenameValue(conv.title);
                      setRenamingId(conv.id);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Rename
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                    onClick={() => onDelete(conv.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}
    </div>
  );
}

// Simulated responses for demo purposes
function getSimulatedResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('document') || lowerMessage.includes('201')) {
    return `Your 201 files can be managed in the "My Documents" section. There you can:

- Upload required documents
- Track document approval status
- Download previously submitted files

Is there a specific document you need help with?`;
  }

  if (
    lowerMessage.includes('payroll') ||
    lowerMessage.includes('salary') ||
    lowerMessage.includes('invoice')
  ) {
    return `For payroll-related queries:

- Submit invoices through the Payroll section
- View your payment history
- Track pending submissions

If you have specific payroll concerns, please contact the HR team directly for confidential matters.`;
  }

  if (lowerMessage.includes('onboarding')) {
    return `Your onboarding progress can be tracked in the Onboarding section. Make sure to:

1. Complete all required document submissions
2. Finish assigned training modules
3. Attend scheduled orientation sessions

You can check your completion percentage on your dashboard.`;
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
    return `I can help you with:

- Document submissions (201 files)
- Payroll and invoice questions
- Onboarding tasks
- Benefits information
- Company policies

What would you like to know more about?`;
  }

  return `Thank you for your question. I understand you're asking about "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}".

For specific HR matters, I recommend:
1. Checking the Information Hub for announcements
2. Reviewing your onboarding checklist
3. Contacting HR directly for complex inquiries

Is there anything else I can help you with?`;
}
