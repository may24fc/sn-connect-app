'use client';

import * as React from 'react';
import {
  Home,
  FolderOpen,
  ClipboardList,
  Receipt,
  Megaphone,
  User,
  Users,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../primitives/tooltip';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

export interface SidebarProps {
  variant: 'employee' | 'admin' | 'cos';
  currentPath: string;
  onNavigate: (href: string) => void;
  logoUrl?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const employeeNavItems: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'My 201 Files', href: '/files', icon: FolderOpen },
  { label: 'Onboarding', href: '/onboarding', icon: ClipboardList },
  { label: 'Payroll', href: '/payroll', icon: Receipt },
  { label: 'Information Hub', href: '/announcements', icon: Megaphone },
  { label: 'Profile', href: '/profile', icon: User },
];

// Admin (HR) - Only probation tracker, no invoice access
const adminNavItems: NavItem[] = [
  { label: 'Probation Tracker', href: '/probation', icon: Users },
];

// COS - Only invoice approvals
const cosNavItems: NavItem[] = [
  { label: 'Invoice Approvals', href: '/cos/invoices', icon: FileCheck },
];

export function Sidebar({
  variant,
  currentPath,
  onNavigate,
  logoUrl,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps): React.ReactNode {
  const navItems =
    variant === 'employee'
      ? employeeNavItems
      : variant === 'cos'
      ? cosNavItems
      : adminNavItems;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'relative flex h-screen flex-col bg-sidebar shadow-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo Section */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-sidebar-border px-4',
            collapsed ? 'justify-center' : 'justify-start gap-3'
          )}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className={cn('h-8 w-auto', collapsed && 'h-6')}
            />
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
                SN
              </div>
              {!collapsed && (
                <span className="text-lg font-semibold text-sidebar-foreground">
                  HR Portal
                </span>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentPath === item.href;
              const Icon = item.icon;

              const navButton = (
                <button
                  type="button"
                  onClick={() => onNavigate(item.href)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-foreground'
                      : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                        {item.badge !== undefined && ` (${item.badge})`}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    navButton
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse Toggle */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-colors hover:bg-sidebar-hover"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Footer */}
        <div
          className={cn(
            'border-t border-sidebar-border p-4',
            collapsed && 'p-2'
          )}
        >
          <p
            className={cn(
              'text-xs text-sidebar-muted',
              collapsed && 'text-center'
            )}
          >
            {collapsed ? 'v1' : 'Version 1.0.0'}
          </p>
        </div>
      </aside>
    </TooltipProvider>
  );
}
