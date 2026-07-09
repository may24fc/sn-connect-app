'use client';

import { ApplicationUpdateHeaderAction } from '@/components/ApplicationUpdateProvider';
import { TourProvider, useTour } from '@/components/TourProvider';
import { type UserRoleType, useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { useAIChat } from '@/hooks/useAIChat';
import { useAIChatSuggestions } from '@/hooks/useAIChatSuggestions';
import { useAtsAccess } from '@/hooks/useAtsAccess';
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useRenameConversation,
} from '@/hooks/useConversations';
import { useCrmAccess } from '@/hooks/useCrmAccess';
import { useExpensesAccess } from '@/hooks/useExpensesAccess';
import { useMarketingReportsAccess } from '@/hooks/useMarketingReportsAccess';
import {
  useDeleteNotification,
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@/hooks/useNotifications';
import { useRevenueForecastAccess } from '@/hooks/useRevenueForecastAccess';
import { Header, NotificationBell, Sidebar, ToastProvider } from '@hr-portal/ui';
import type { ChatMessage, ConversationItem } from '@hr-portal/ui';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

const AIChatbot = dynamic(
  () => import('@hr-portal/ui').then((module_) => ({ default: module_.AIChatbot })),
  {
    ssr: false,
  }
);

export interface SelfServiceLayoutShellProps {
  children: ReactNode;
  allowedRoles: Array<UserRoleType>;
}

export function SelfServiceLayoutShell({
  children,
  allowedRoles,
}: SelfServiceLayoutShellProps): ReactNode {
  const user = useRequireAuth(allowedRoles);
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleProfileClick = (): void => {
    if (user.role === 'intern') {
      router.push('/intern/profile');
      return;
    }

    if (user.role === 'admin' || user.role === 'super_admin') {
      router.push('/admin/profile');
      return;
    }

    router.push('/profile');
  };

  const handleSettingsClick = (): void => {
    if (user.role === 'intern') {
      router.push('/intern/settings');
      return;
    }

    router.push('/settings');
  };

  return (
    <ToastProvider>
      <TourProvider>
        <SelfServiceLayoutInner
          user={user}
          pathname={pathname}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          onNavigate={handleNavigate}
          onLogout={logout}
          onProfileClick={handleProfileClick}
          onSettingsClick={handleSettingsClick}
        >
          {children}
        </SelfServiceLayoutInner>
      </TourProvider>
    </ToastProvider>
  );
}

function SelfServiceLayoutInner({
  user,
  pathname,
  sidebarCollapsed,
  setSidebarCollapsed,
  mobileMenuOpen,
  setMobileMenuOpen,
  onNavigate,
  onLogout,
  onProfileClick,
  onSettingsClick,
  children,
}: {
  user: NonNullable<ReturnType<typeof useRequireAuth>>;
  pathname: string;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (value: boolean) => void;
  onNavigate: (href: string) => void;
  onLogout: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  children: ReactNode;
}): ReactNode {
  const { startTour, currentGroup } = useTour();
  const { theme, setTheme } = useTheme();
  const marketingReportsAccess = useMarketingReportsAccess();
  const atsAccess = useAtsAccess(user.role === 'employee' || user.role === 'intern');
  const crmAccess = useCrmAccess(user.role === 'employee' || user.role === 'intern');
  const revenueForecastAccess = useRevenueForecastAccess(
    user.role === 'employee' || user.role === 'intern'
  );
  const expensesAccess = useExpensesAccess();
  const sidebarVariant =
    user.role === 'intern'
      ? 'intern'
      : user.role === 'admin' || user.role === 'super_admin'
        ? user.role
        : 'employee';
  const sidebarPath = pathname.startsWith('/my-performance') ? '/performance' : pathname;

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden flex-shrink-0 lg:block">
        <Sidebar
          variant={sidebarVariant}
          currentPath={sidebarPath}
          onNavigate={onNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          showMarketingReports={marketingReportsAccess.canAccess}
          showAtsAccess={Boolean(atsAccess.data?.canAccess)}
          showCrmAccess={Boolean(crmAccess.data?.canAccess)}
          showRevenueForecastAccess={Boolean(revenueForecastAccess.data?.canAccess)}
          showExpenseDeskAccess={
            expensesAccess.capabilities.canViewDeskGlobal ||
            expensesAccess.capabilities.canViewDeskDepartment
          }
        />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
                setMobileMenuOpen(false);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Close menu overlay"
          />
          <div className="relative z-10 flex-shrink-0">
            <Sidebar
              variant={sidebarVariant}
              currentPath={sidebarPath}
              onNavigate={onNavigate}
              showMarketingReports={marketingReportsAccess.canAccess}
              showAtsAccess={Boolean(atsAccess.data?.canAccess)}
              showCrmAccess={Boolean(crmAccess.data?.canAccess)}
              showRevenueForecastAccess={Boolean(revenueForecastAccess.data?.canAccess)}
              showExpenseDeskAccess={
                expensesAccess.capabilities.canViewDeskGlobal ||
                expensesAccess.capabilities.canViewDeskDepartment
              }
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          onLogout={onLogout}
          onProfileClick={onProfileClick}
          onSettingsClick={onSettingsClick}
          onHelpClick={currentGroup ? startTour : undefined}
          notificationSlot={<SelfServiceNotificationBell />}
          aiChatSlot={
            <div className="flex items-center gap-2">
              <ApplicationUpdateHeaderAction />
              <SelfServiceAIChatbot />
            </div>
          }
          theme={theme ?? 'light'}
          onThemeChange={setTheme}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function SelfServiceNotificationBell(): ReactNode {
  const router = useRouter();
  const { user } = useAuth();
  const { data } = useNotifications({ page: 1, pageSize: 5 });
  const { data: unreadCount } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const deleteNotification = useDeleteNotification();

  const notificationsPath =
    user?.role === 'super_admin'
      ? '/super-admin/notifications'
      : user?.role === 'admin'
        ? '/admin/notifications'
        : '/notifications';

  return (
    <NotificationBell
      notifications={data?.data ?? []}
      unreadCount={unreadCount ?? 0}
      onMarkRead={(id) => markRead.mutate(id)}
      onMarkAllRead={() => markAllRead.mutate()}
      onDelete={(id) => deleteNotification.mutate(id)}
      onNavigate={(path) => router.push(path)}
      onViewAll={() => router.push(notificationsPath)}
    />
  );
}

function SelfServiceAIChatbot(): ReactNode {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const conversations: Array<ConversationItem> = (conversationsData?.data ?? []).map(
    (conversation) => ({
      id: conversation.id,
      title: conversation.title,
      createdAt: new Date(conversation.created_at),
      updatedAt: new Date(conversation.updated_at),
    })
  );

  const handleCreate = (): void => {
    createConversation.mutate(undefined, {
      onSuccess: (conversation) => {
        activeConversationIdRef.current = conversation.id;
        setActiveConversationId(conversation.id);
        clearHistory();
        void refetchSuggestions();
      },
    });
  };

  const handleSelect = (id: string): void => {
    activeConversationIdRef.current = id;
    setActiveConversationId(id);
    clearHistory();
    void loadMessages(id);
  };

  const guardedSendMessage = useCallback(
    async (content: string): Promise<void> => {
      const currentConversationId = activeConversationIdRef.current;

      if (currentConversationId) {
        return sendMessage(content, currentConversationId);
      }

      try {
        const conversation = await createConversation.mutateAsync(undefined);
        activeConversationIdRef.current = conversation.id;
        setActiveConversationId(conversation.id);
        return sendMessage(content, conversation.id);
      } catch {
        return sendMessage(content);
      }
    },
    [sendMessage, createConversation]
  );

  const handleRename = (id: string, title: string): void => {
    renameConversation.mutate({ id, title });
  };

  const handleDelete = (id: string): void => {
    const isDeletingActiveConversation = activeConversationIdRef.current === id;

    deleteConversation.mutate(id, {
      onSuccess: () => {
        if (isDeletingActiveConversation) {
          activeConversationIdRef.current = null;
          setActiveConversationId(null);
          clearHistory();
          void refetchSuggestions();
        }
      },
    });
  };

  const chatMessages: Array<ChatMessage> = messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    isStreaming: message.isStreaming ?? false,
    citations:
      message.citations?.map((citation) => ({
        id: citation.id,
        sourceId: citation.sourceId,
        sourceName: citation.sourceName,
        exactQuote: citation.exactQuote,
        ...(citation.citedText !== undefined ? { citedText: citation.citedText } : {}),
        relevanceScore: citation.relevanceScore,
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
