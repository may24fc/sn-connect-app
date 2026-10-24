'use client';

import {
  type InsightConversation,
  getRetryAfterMinutes,
  useDeleteInsightConversation,
  useInsightChat,
  useInsightConversation,
  useInsightConversations,
  useRenameInsightConversation,
} from '@/hooks/usePerformanceInsights';
import {
  INSIGHT_DEFAULT_MONTHS_BACK,
  INSIGHT_MAX_MONTHS_BACK,
} from '@/lib/performance/insights/config';
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SlidePanel,
  SlidePanelContent,
  SlidePanelDescription,
  SlidePanelHeader,
  SlidePanelTitle,
  useToast,
} from '@hr-portal/ui';
import { History, MessageSquarePlus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { InsightComposer } from './InsightComposer';
import { InsightConversationList } from './InsightConversationList';
import { InsightThread } from './InsightThread';
import { formatInsightWindow } from './starterQuestions';

const EVALUATION_KIND = 'five_percent' as const;
const MONTHS_BACK_OPTIONS = Array.from(
  { length: INSIGHT_MAX_MONTHS_BACK + 1 },
  (_, index) => index
);

type ReflectionInsightsPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string;
};

export function ReflectionInsightsPanel({
  open,
  onOpenChange,
  monthKey,
}: ReflectionInsightsPanelProps) {
  const { addToast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftMonthsBack, setDraftMonthsBack] = useState(INSIGHT_DEFAULT_MONTHS_BACK);
  const [question, setQuestion] = useState('');
  const [showHistoryOnMobile, setShowHistoryOnMobile] = useState(false);

  const conversationsQuery = useInsightConversations(EVALUATION_KIND, open);
  const detailQuery = useInsightConversation(activeId);
  const renameMutation = useRenameInsightConversation(EVALUATION_KIND);
  const deleteMutation = useDeleteInsightConversation(EVALUATION_KIND);

  const handleChatError = useCallback(
    (failedQuestion: string, error: Error) => {
      setQuestion((current) => current || failedQuestion);
      const retryMinutes = getRetryAfterMinutes(error);
      addToast({
        title: retryMinutes ? 'Question limit reached' : 'Unable to answer',
        description: retryMinutes
          ? `You can ask again in about ${retryMinutes} minutes.`
          : error.message,
        variant: 'error',
      });
    },
    [addToast]
  );

  const chat = useInsightChat({ onConversationReady: setActiveId, onError: handleChatError });

  const activeConversation =
    detailQuery.data?.conversation ??
    conversationsQuery.data?.conversations.find((conversation) => conversation.id === activeId) ??
    null;
  const windowLabel = activeConversation
    ? formatInsightWindow(activeConversation.periodKey, activeConversation.monthsBack)
    : formatInsightWindow(monthKey, draftMonthsBack);

  const ask = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || chat.isStreaming) return;
    setQuestion('');
    void chat.send({
      conversationId: activeId,
      evaluationKind: EVALUATION_KIND,
      periodKey: activeConversation?.periodKey ?? monthKey,
      monthsBack: activeConversation?.monthsBack ?? draftMonthsBack,
      message: trimmed,
    });
  };

  const startNew = () => {
    setActiveId(null);
    setShowHistoryOnMobile(false);
  };

  const selectConversation = (id: string) => {
    setActiveId(id);
    setShowHistoryOnMobile(false);
  };

  const renameConversation = (id: string, title: string) => {
    renameMutation.mutate(
      { id, title },
      {
        onError: (error) =>
          addToast({ title: 'Unable to rename', description: error.message, variant: 'error' }),
      }
    );
  };

  const deleteConversation = (conversation: InsightConversation) => {
    if (
      !window.confirm(
        `Delete "${conversation.title}"? It disappears now and its saved answers are permanently erased after 30 days.`
      )
    ) {
      return;
    }
    if (conversation.id === activeId) setActiveId(null);
    deleteMutation.mutate(
      { id: conversation.id },
      {
        onError: (error) =>
          addToast({ title: 'Unable to delete', description: error.message, variant: 'error' }),
      }
    );
  };

  const conversationList = (
    <InsightConversationList
      conversations={conversationsQuery.data?.conversations ?? []}
      activeId={activeId}
      isLoading={conversationsQuery.isLoading}
      loadError={conversationsQuery.error ? conversationsQuery.error.message : null}
      disabled={chat.isStreaming}
      onSelect={selectConversation}
      onNew={startNew}
      onRename={renameConversation}
      onDelete={deleteConversation}
    />
  );

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange}>
      <SlidePanelContent size="3xl" className="lg:max-w-5xl">
        <SlidePanelHeader className="gap-3 px-4 py-4 pr-12 sm:px-6">
          <div className="space-y-1">
            <SlidePanelTitle>Ask AI about 5% Reflections</SlidePanelTitle>
            <SlidePanelDescription>
              Ask follow-up questions about everyone&apos;s reflections. Conversations are saved and
              visible only to you.
            </SlidePanelDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" data-testid="insight-window">
              {windowLabel}
            </Badge>
            {activeId === null ? (
              <Select
                value={String(draftMonthsBack)}
                onValueChange={(value) => setDraftMonthsBack(Number(value))}
                disabled={chat.isStreaming}
              >
                <SelectTrigger
                  className="h-8 w-auto gap-2 text-xs"
                  aria-label="Earlier months to include"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_BACK_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option === 0
                        ? 'Selected month only'
                        : `+${option} earlier month${option === 1 ? '' : 's'}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <div className="ml-auto flex gap-2 lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistoryOnMobile((value) => !value)}
                aria-pressed={showHistoryOnMobile}
              >
                <History className="h-4 w-4" />
                History
              </Button>
              <Button variant="outline" size="sm" onClick={startNew} disabled={chat.isStreaming}>
                <MessageSquarePlus className="h-4 w-4" />
                <span className="sr-only">New conversation</span>
              </Button>
            </div>
          </div>
        </SlidePanelHeader>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-64 shrink-0 flex-col border-r border-border lg:flex">
            {conversationList}
          </aside>
          <section className="flex min-w-0 flex-1 flex-col">
            {showHistoryOnMobile ? (
              <div className="flex min-h-0 flex-1 flex-col lg:hidden">{conversationList}</div>
            ) : null}
            <div
              className={
                showHistoryOnMobile
                  ? 'hidden min-h-0 flex-1 flex-col lg:flex'
                  : 'flex min-h-0 flex-1 flex-col'
              }
            >
              <InsightThread
                messages={activeId ? (detailQuery.data?.messages ?? []) : []}
                pending={chat.pending}
                isLoading={Boolean(activeId) && detailQuery.isLoading && !chat.pending}
                loadError={activeId && detailQuery.error ? detailQuery.error.message : null}
                onRetryLoad={() => void detailQuery.refetch()}
                isStale={Boolean(activeId && detailQuery.data?.isStale)}
                isStreaming={chat.isStreaming}
                windowLabel={windowLabel}
                onAskStarter={ask}
              />
              <InsightComposer
                value={question}
                onChange={setQuestion}
                onSubmit={() => ask(question)}
                onStop={chat.stop}
                isStreaming={chat.isStreaming}
              />
            </div>
          </section>
        </div>
      </SlidePanelContent>
    </SlidePanel>
  );
}
