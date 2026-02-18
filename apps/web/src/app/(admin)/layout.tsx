'use client';

import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { AIChatbot, Header, Sidebar, ToastProvider } from '@hr-portal/ui';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

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
    router.push('/profile');
  };

  return (
    <ToastProvider>
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar
          variant={user.role}
          currentPath={pathname}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 flex-shrink-0">
            <Sidebar variant={user.role} currentPath={pathname} onNavigate={handleNavigate} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          onLogout={handleLogout}
          onProfileClick={handleProfileClick}
          notificationCount={5}
          onNotificationsClick={() => {
            // TODO: Open notifications panel
          }}
        />

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>

      {/* AI Chatbot */}
      <AIChatbot />
      </div>
    </ToastProvider>
  );
}
