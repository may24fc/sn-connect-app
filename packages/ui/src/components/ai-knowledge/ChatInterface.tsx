'use client';

import * as React from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '../../primitives/button';
import { Textarea } from '../../primitives/textarea';
import { cn } from '../../utils/cn';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType, SourceAttribution } from '../../types/ai-knowledge.types';

export interface ChatInterfaceProps {
  debugMode: boolean;
  className?: string;
}

// Mock chat responses
function getMockResponse(userMessage: string): {
  content: string;
  sources: SourceAttribution[];
} {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('vacation') || lowerMessage.includes('pto')) {
    return {
      content: `According to our PTO policy, employees are entitled to:

- 15 days of paid vacation per year
- Accrual starts after 3 months of employment
- Requests must be submitted at least 2 weeks in advance
- Maximum carryover of 5 days to the next year

Would you like more specific information about requesting time off?`,
      sources: [
        {
          sourceId: '1',
          fileName: 'Employee_Handbook_2024.pdf',
          pageNumber: 23,
          chunkPreview: 'Employees are entitled to fifteen (15) days of paid vacation per calendar year...',
        },
        {
          sourceId: '4',
          fileName: 'PTO_Policy_Updates.pdf',
          pageNumber: 2,
          chunkPreview: 'Recent updates: Maximum carryover increased from 3 to 5 days effective Q1 2024...',
        },
      ],
    };
  }

  if (lowerMessage.includes('remote') || lowerMessage.includes('work from home') || lowerMessage.includes('wfh')) {
    return {
      content: `Our remote work policy includes:

- Hybrid schedule: 3 days in office, 2 days remote
- Fully remote options available for specific roles
- Home office stipend: $500 annually
- Core hours: 10 AM - 3 PM in your timezone
- Required: stable internet (min 25 Mbps) and dedicated workspace

Need help setting up remote work arrangements?`,
      sources: [
        {
          sourceId: '5',
          fileName: 'Remote_Work_Guidelines.pdf',
          pageNumber: 4,
          chunkPreview: 'All remote employees must maintain a dedicated workspace with reliable internet connectivity...',
        },
        {
          sourceId: '5',
          fileName: 'Remote_Work_Guidelines.pdf',
          pageNumber: 7,
          chunkPreview: 'The company provides an annual home office stipend of $500 to cover equipment and supplies...',
        },
      ],
    };
  }

  if (lowerMessage.includes('benefit') || lowerMessage.includes('insurance') || lowerMessage.includes('health')) {
    return {
      content: `Our comprehensive benefits package includes:

- Health insurance: Medical, dental, and vision coverage
- 401(k) matching: Up to 4% of salary
- Life insurance: 2x annual salary
- Wellness program: Gym membership reimbursement
- Professional development: $1,500 annual budget

Which benefit would you like to learn more about?`,
      sources: [
        {
          sourceId: '2',
          fileName: 'Benefits_Overview_Q1.docx',
          pageNumber: 1,
          chunkPreview: 'Our benefits package is designed to support your health, financial security, and professional growth...',
        },
      ],
    };
  }

  return {
    content: `I'm here to help you with HR-related questions. I can provide information about:

- Time off policies (PTO, sick leave, holidays)
- Remote work guidelines and hybrid schedules
- Employee benefits and insurance
- Company policies and procedures
- Onboarding and training resources

What specific information are you looking for?`,
    sources: [],
  };
}

export function ChatInterface({
  debugMode,
  className,
}: ChatInterfaceProps): React.ReactNode {
  const [messages, setMessages] = React.useState<ChatMessageType[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m the HR Agent simulator. Ask me anything about HR policies, and I\'ll respond using the knowledge base documents you\'ve uploaded.',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (): Promise<void> => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const { content, sources } = getMockResponse(userMessage.content);

    const assistantMessage: ChatMessageType = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      ...(sources.length > 0 && { sources }),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={cn('flex flex-col h-full overflow-hidden bg-muted/20', className)}>
      {/* Messages Area - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            showDebug={debugMode}
          />
        ))}

        {isLoading && (
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
          />
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
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground/70 text-center">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground font-mono text-[10px]">Enter</kbd> to send,{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground font-mono text-[10px]">Shift + Enter</kbd> for new line
        </p>
      </div>

      <style jsx global>{`
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

// Missing imports for Avatar fallback in loading state
import { Avatar, AvatarFallback } from '../../primitives/avatar';
import { Bot } from 'lucide-react';
