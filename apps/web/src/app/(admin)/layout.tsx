'use client';

import { TourProvider, useTour } from '@/components/TourProvider';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import {
  useDeleteNotification,
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@/hooks/useNotifications';
import { Header, NotificationBell, Sidebar, ToastProvider } from '@hr-portal/ui';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

// Lazy-load the chatbot — it's interactive and only opened on demand
const AIChatbot = dynamic(() => import('@hr-portal/ui').then((m) => ({ default: m.AIChatbot })), {
  ssr: false,
});

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const user = useRequireAuth(['admin', 'super_admin']);
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
    router.push('/admin/profile');
  };

  return (
    <ToastProvider>
      <TourProvider>
        <AdminLayoutInner
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
        </AdminLayoutInner>
      </TourProvider>
    </ToastProvider>
  );
}

function AdminLayoutInner({
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

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar
          variant={user.role}
          currentPath={pathname}
          onNavigate={onNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 flex-shrink-0">
            <Sidebar variant={user.role} currentPath={pathname} onNavigate={onNavigate} />
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
          notificationSlot={<AdminNotificationBell />}
          aiChatSlot={<AIChatbot />}
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
function AdminNotificationBell(): ReactNode {
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
      onViewAll={() => router.push('/admin/notifications')}
    />
  );
}
