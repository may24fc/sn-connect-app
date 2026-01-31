'use client';

import { useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, Header, AIChatbot } from '@hr-portal/ui';

// Mock COS user data - replace with actual auth context
const mockCosUser = {
  name: 'COS Manager',
  email: 'cos@company.com',
  role: 'cos',
};

export default function COSLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (href: string): void => {
    router.push(href);
    setMobileMenuOpen(false);
  };

  const handleLogout = (): void => {
    // TODO: Implement actual logout logic
    router.push('/login');
  };

  const handleProfileClick = (): void => {
    router.push('/profile');
  };

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          variant="cos"
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
              variant="cos"
              currentPath={pathname}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={mockCosUser}
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
