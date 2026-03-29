'use client';

import { TourProvider, useTour } from '@/components/TourProvider';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { useAIChat } from '@/hooks/useAIChat';
import { useAIChatSuggestions } from '@/hooks/useAIChatSuggestions';
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useRenameConversation,
} from '@/hooks/useConversations';
import {
  useDeleteNotification,
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@/hooks/useNotifications';
import { useMarketingReportsAccess } from '@/hooks/useMarketingReportsAccess';
import { Header, NotificationBell, Sidebar, ToastProvider } from '@hr-portal/ui';
import type { ChatMessage, ConversationItem } from '@hr-portal/ui';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useState } from 'react';

// Lazy-load the chatbot — it's interactive and only opened on demand
const AIChatbot = dynamic(() => import('@hr-portal/ui').then((m) => ({ default: m.AIChatbot })), {
  ssr: false,
});

export default function EmployeeLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const user = useRequireAuth(['employee', 'intern']);
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Show loading state while user is being verified
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/30">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleNavigate = (href: string): void => {
    router.push(href);
    setMobileMenuOpen(false);
  };

  const handleLogout = (): void => {
    logout();
  };

  const handleProfileClick = (): void => {
    router.push(user.role === 'intern' ? '/intern/profile' : '/profile');
  };

  return (
    <ToastProvider>
      <TourProvider>
        <EmployeeLayoutInner
          user={user}
          pathname={pathname}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onProfileClick={handleProfileClick}
        >
          {children}
        </EmployeeLayoutInner>
      </TourProvider>
    </ToastProvider>
  );
}

function EmployeeLayoutInner({
  user,
  pathname,
  sidebarCollapsed,
  setSidebarCollapsed,
  mobileMenuOpen,
  setMobileMenuOpen,
  onNavigate,
  onLogout,
  onProfileClick,
  children,
}: {
  user: NonNullable<ReturnType<typeof useRequireAuth>>;
  pathname: string;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
  onNavigate: (href: string) => void;
  onLogout: () => void;
  onProfileClick: () => void;
  children: ReactNode;
}): ReactNode {
  const { startTour, currentGroup } = useTour();
  const { theme, setTheme } = useTheme();
  const marketingReportsAccess = useMarketingReportsAccess();

  // Determine sidebar variant based on user role
  const sidebarVariant = user.role === 'intern' ? 'intern' : 'employee';

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar
          variant={sidebarVariant}
          currentPath={pathname}
          onNavigate={onNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          showMarketingReports={marketingReportsAccess.canAccess}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 flex-shrink-0">
            <Sidebar
              variant={sidebarVariant}
              currentPath={pathname}
              onNavigate={onNavigate}
              showMarketingReports={marketingReportsAccess.canAccess}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          onLogout={onLogout}
          onProfileClick={onProfileClick}
          onHelpClick={currentGroup ? startTour : undefined}
          notificationSlot={<EmployeeNotificationBell />}
          aiChatSlot={<EmployeeAIChatbot />}
          theme={theme ?? 'light'}
          onThemeChange={setTheme}
        />

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

/** Wires real notification data into the NotificationBell component */
function EmployeeNotificationBell(): ReactNode {
  const router = useRouter();
  const { data } = useNotifications({ page: 1, pageSize: 5 });
  const { data: unreadCount } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const deleteNotification = useDeleteNotification();

  return (
    <NotificationBell
      notifications={data?.data ?? []}
      unreadCount={unreadCount ?? 0}
      onMarkRead={(id) => markRead.mutate(id)}
      onMarkAllRead={() => markAllRead.mutate()}
      onDelete={(id) => deleteNotification.mutate(id)}
      onNavigate={(path) => router.push(path)}
      onViewAll={() => router.push('/notifications')}
    />
  );
}

/** Wires useAIChat streaming hook + conversation persistence into the AIChatbot component */
function EmployeeAIChatbot(): ReactNode {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const { messages, sendMessage, isLoading, clearHistory, abort, loadMessages } = useAIChat({
    conversationId: activeConversationId,
  });
  const {
    data: suggestionsData,
    isFetching: isSuggestionsLoading,
    refetch: refetchSuggestions,
  } = useAIChatSuggestions({ enabled: false });

  const { data: conversationsData } = useConversations();
  const createConversation = useCreateConversation();
  const renameConversation = useRenameConversation();
  const deleteConversation = useDeleteConversation();

  const conversations: ConversationItem[] = (conversationsData?.data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: new Date(c.created_at),
    updatedAt: new Date(c.updated_at),
  }));

  const handleCreate = (): void => {
    createConversation.mutate(undefined, {
      onSuccess: (conv) => {
        setActiveConversationId(conv.id);
        clearHistory();
        void refetchSuggestions();
      },
    });
  };

  const handleSelect = (id: string): void => {
    setActiveConversationId(id);
    clearHistory();
    void loadMessages(id);
  };

  // Auto-create a DB conversation on the first message if none is active yet,
  // then pass the new ID directly to sendMessage (before React re-renders).
  const guardedSendMessage = useCallback(
    async (content: string): Promise<void> => {
      if (activeConversationId) {
        return sendMessage(content);
      }
      try {
        const conv = await createConversation.mutateAsync(undefined);
        setActiveConversationId(conv.id);
        return sendMessage(content, conv.id);
      } catch {
        return sendMessage(content);
      }
    },
    [activeConversationId, sendMessage, createConversation]
  );

  const handleRename = (id: string, title: string): void => {
    renameConversation.mutate({ id, title });
  };

  const handleDelete = (id: string): void => {
    deleteConversation.mutate(id, {
      onSuccess: () => {
        if (activeConversationId === id) {
          setActiveConversationId(null);
          clearHistory();
          void refetchSuggestions();
        }
      },
    });
  };

  const chatMessages: ChatMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
    isStreaming: m.isStreaming ?? false,
    citations: m.citations?.map((c) => ({
      id: c.id,
      sourceId: c.sourceId,
      sourceName: c.sourceName,
      exactQuote: c.exactQuote,
      ...(c.citedText !== undefined && { citedText: c.citedText }),
      relevanceScore: c.relevanceScore,
    })) ?? [],
  }));

  return (
    <AIChatbot
      messages={chatMessages}
      onStreamMessage={guardedSendMessage}
      isStreamLoading={isLoading}
      onAbort={abort}
      onClearHistory={clearHistory}
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelectConversation={handleSelect}
      onCreateConversation={handleCreate}
      onRenameConversation={handleRename}
      onDeleteConversation={handleDelete}
      suggestions={suggestionsData?.data ?? []}
      isSuggestionsLoading={isSuggestionsLoading}
      liveSync={suggestionsData?.liveSync ?? null}
      onOpenChange={(open) => {
        if (open) {
          void refetchSuggestions();
        }
      }}
    />
  );
}
