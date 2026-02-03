'use client';

import { useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, Header, AIChatbot } from '@hr-portal/ui';
import { useRequireAuth, useAuth } from '@/contexts/AuthContext';

export default function EmployeeLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const user = useRequireAuth(['employee']);
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="flex h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          variant="employee"
          currentPath={pathname}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10">
            <Sidebar
              variant="employee"
              currentPath={pathname}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          onLogout={handleLogout}
          onProfileClick={handleProfileClick}
          notificationCount={3}
          onNotificationsClick={() => {
            // TODO: Open notifications panel
          }}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* AI Chatbot */}
      <AIChatbot />
    </div>
  );
}
