'use client';

import { Loader2, Send, Sparkles, User, X } from 'lucide-react';
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

export function AIChatbot({
  onSendMessage,
  welcomeMessage = defaultWelcomeMessage,
  placeholder = 'Ask me anything about HR...',
  className,
}: AIChatbotProps): React.ReactNode {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Array<ChatMessage>>([
    {
      id: '1',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

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
  }, [isOpen]);

  const handleSendMessage = async (): Promise<void> => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let response: string;

      if (onSendMessage) {
        response = await onSendMessage(userMessage.content);
      } else {
        // Simulated response for demo
        await new Promise((resolve) => setTimeout(resolve, 1000));
        response = getSimulatedResponse(userMessage.content);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (_error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          'I apologize, but I encountered an error. Please try again or contact IT support if the issue persists.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className={cn('relative', className)}>
      {/* Backdrop — closes panel when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Chat Panel — drops down from header, anchored top-right */}
      {isOpen && (
        <div className="fixed top-[65px] right-4 z-50 flex flex-col w-[380px] h-[520px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-indigo-600 px-4 py-3 rounded-t-xl flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">SN Connect AI</h3>
                <p className="text-[11px] text-white/70">HR Assistant · Powered by AI</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI panel"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2.5',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback
                    className={cn(
                      'text-[11px]',
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
                    'max-w-[78%] rounded-lg px-3 py-2',
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p
                    className={cn(
                      'mt-1 text-[11px]',
                      message.role === 'user' ? 'text-white/60' : 'text-zinc-400 dark:text-zinc-500'
                    )}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="bg-indigo-600 text-white">
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" strokeWidth={1.5} />
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isLoading}
                className="flex-1 h-9 px-3 text-sm bg-zinc-100 dark:bg-zinc-800 border border-transparent rounded-lg placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white dark:focus:bg-zinc-900 transition-all"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className="h-9 w-9 flex-shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>
            <p className="mt-2 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
              AI may make mistakes. Verify important information.
            </p>
          </div>
        </div>
      )}

      {/* Header Trigger Button — Gemini-style icon */}
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
            isOpen ? 'text-indigo-600' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200'
          )}
          strokeWidth={1.5}
        />
        {/* Active indicator dot */}
        {isOpen && (
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        )}
      </Button>
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
