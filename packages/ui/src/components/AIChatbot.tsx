'use client';

import { Loader2, Maximize2, MessageSquare, Minimize2, PanelLeft, Plus, Send, Sparkles, User, X } from 'lucide-react';
import * as React from 'react';
import { Avatar, AvatarFallback } from '../primitives/avatar';
import { Button } from '../primitives/button';
import { Input } from '../primitives/input';
import { cn } from '../utils/cn';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Array<ChatMessage>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIChatbotProps {
  onSendMessage?: (message: string) => Promise<string>;
  welcomeMessage?: string;
  placeholder?: string;
  className?: string;
}

const defaultWelcomeMessage = `Hi! I'm SN Connect AI. I can help you with:

- Employee policies and procedures
- Leave requests and balances
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
  welcomeMessage = defaultWelcomeMessage,
  placeholder = 'Ask me anything about HR...',
  className,
}: AIChatbotProps): React.ReactNode {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(true);
  const [conversations, setConversations] = React.useState<Array<Conversation>>([
    makeWelcomeConversation(welcomeMessage),
  ]);
  const [activeConversationId, setActiveConversationId] = React.useState('1');
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const messages = activeConversation?.messages ?? [];

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, activeConversationId]);

  // Auto-show history sidebar when entering fullscreen
  React.useEffect(() => {
    if (isFullscreen) setShowHistory(true);
  }, [isFullscreen]);

  const handleNewConversation = (): void => {
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
    setInputValue('');
  };

  const handleSelectConversation = (id: string): void => {
    setActiveConversationId(id);
    setInputValue('');
  };

  const handleSendMessage = async (): Promise<void> => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
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

    setInputValue('');
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
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date): string =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const formatGroupDate = (date: Date): string =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const grouped = groupConversationsByDate(conversations);

  return (
    <div className={cn('relative', className)}>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 dark:bg-black/50 transition-opacity duration-300 ease-in-out',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Chat Panel */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-white dark:bg-zinc-900',
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
              'flex flex-col flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950',
              'transition-[width,opacity] duration-300 ease-in-out overflow-hidden',
              showHistory && isFullscreen ? 'w-64 opacity-100' : 'w-0 opacity-0'
            )}
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-3 h-14 flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Conversations
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                onClick={handleNewConversation}
                aria-label="New conversation"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'thin' }}>
              {grouped.today.length > 0 && (
                <ConversationGroup
                  label="Today"
                  conversations={grouped.today}
                  activeId={activeConversationId}
                  onSelect={handleSelectConversation}
                  formatDate={formatGroupDate}
                />
              )}
              {grouped.yesterday.length > 0 && (
                <ConversationGroup
                  label="Yesterday"
                  conversations={grouped.yesterday}
                  activeId={activeConversationId}
                  onSelect={handleSelectConversation}
                  formatDate={formatGroupDate}
                />
              )}
              {grouped.older.length > 0 && (
                <ConversationGroup
                  label="Older"
                  conversations={grouped.older}
                  activeId={activeConversationId}
                  onSelect={handleSelectConversation}
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
                {/* History toggle — only visible in fullscreen */}
                {isFullscreen && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-8 w-8 transition-colors',
                      showHistory
                        ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60'
                        : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    )}
                    onClick={() => setShowHistory((v) => !v)}
                    aria-label="Toggle conversation history"
                  >
                    <PanelLeft className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                )}
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/10 dark:bg-indigo-500/15">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
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
              </div>

              <div className="flex items-center gap-1">
                {/* New Chat — only visible in fullscreen when history is hidden */}
                {isFullscreen && !showHistory && (
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
                  onClick={() => setIsOpen(false)}
                  aria-label="Close AI panel"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div
              className={cn(
                'flex-1 overflow-y-auto py-6 space-y-5',
                isFullscreen ? 'px-8' : 'px-5'
              )}
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(228 228 231) transparent' }}
            >
              {/* Center messages when fullscreen for readability */}
              <div className={cn(isFullscreen && 'max-w-3xl mx-auto')}>
                {messages.map((message) => (
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
                            ? 'bg-indigo-600 text-white'
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
                        'flex flex-col gap-1',
                        message.role === 'user' ? 'items-end' : 'items-start'
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-xl px-4 py-2.5',
                          isFullscreen ? 'max-w-[70%]' : 'max-w-[85%]',
                          message.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-sm'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 mb-5">
                    <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                      <AvatarFallback className="bg-indigo-600 text-white">
                        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2 rounded-xl rounded-tl-sm bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" strokeWidth={1.5} />
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div
              className={cn(
                'border-t border-zinc-200 dark:border-zinc-800 py-4 flex-shrink-0',
                isFullscreen ? 'px-8' : 'px-5'
              )}
            >
              <div className={cn(isFullscreen && 'max-w-3xl mx-auto')}>
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={isLoading}
                    className="flex-1 h-10 px-4 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    size="icon"
                    className="h-10 w-10 flex-shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
                <p className="mt-2.5 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                  AI may make mistakes. Verify important information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open AI Assistant"
        aria-expanded={isOpen}
        className={cn(
          'group relative h-9 w-9 transition-colors',
          isOpen
            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600'
            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200'
        )}
      >
        <Sparkles
          className={cn(
            'h-[18px] w-[18px] transition-colors',
            isOpen
              ? 'text-indigo-600'
              : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200'
          )}
          strokeWidth={1.5}
        />
        {isOpen && (
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
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
  formatDate: (date: Date) => string;
}

function ConversationGroup({
  label,
  conversations,
  activeId,
  onSelect,
  formatDate,
}: ConversationGroupProps): React.ReactNode {
  return (
    <div className="mb-1">
      <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
        {label}
      </p>
      {conversations.map((conv) => (
        <button
          key={conv.id}
          type="button"
          onClick={() => onSelect(conv.id)}
          className={cn(
            'w-full flex items-start gap-2.5 px-3 py-2 text-left rounded-md mx-1 transition-colors',
            'hover:bg-zinc-200/60 dark:hover:bg-zinc-800',
            activeId === conv.id
              ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
              : 'text-zinc-600 dark:text-zinc-400'
          )}
          style={{ width: 'calc(100% - 8px)' }}
        >
          <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-zinc-400" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate leading-snug">{conv.title}</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              {formatDate(conv.updatedAt)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// Simulated responses for demo purposes
function getSimulatedResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('leave') || lowerMessage.includes('vacation')) {
    return `For leave requests, you can:

1. Go to the Payroll section to submit time-off requests
2. Check your leave balance in your Profile
3. View pending requests in your dashboard

Would you like me to help you with a specific leave request?`;
  }

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

- Leave requests and balances
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
