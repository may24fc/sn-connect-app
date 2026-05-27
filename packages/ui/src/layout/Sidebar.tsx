'use client';

import {
  Briefcase,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileCheck,
  FileText,
  FolderKanban,
  FolderOpen,
  GraduationCap,
  Home,
  Library,
  LifeBuoy,
  type LucideIcon,
  Megaphone,
  Receipt,
  Sparkles,
  Target,
  Trophy,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import type * as React from 'react';
import { CountBadge } from '../primitives/count-badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../primitives/tooltip';
import { cn } from '../utils/cn';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

export type UserRole = 'employee' | 'intern' | 'admin' | 'super_admin';

export interface SidebarProps {
  variant: UserRole;
  currentPath: string;
  onNavigate: (href: string) => void;
  logoUrl?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  showMarketingReports?: boolean;
  showAtsAccess?: boolean;
}

const employeeAtsNavItems: Array<NavItem> = [
  { label: 'Recruitment', href: '/ats/recruitment', icon: Briefcase },
  { label: 'Jobs', href: '/ats/jobs', icon: ClipboardList },
];

// Employee navigation
const employeeNavItems: Array<NavItem> = [
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Marketing Reports', href: '/reports', icon: FileText },
  { label: 'OKRs & KPIs', href: '/performance', icon: Target },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Company Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Self-Evaluation', href: '/performance/self-evaluation', icon: FileText },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Tickets', href: '/tickets', icon: LifeBuoy },
  { label: 'Invoice', href: '/invoice', icon: Receipt },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Checklist', href: '/onboarding', icon: ClipboardList },
  { label: 'Documents', href: '/files', icon: FolderOpen },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
  { label: 'Resources', href: '/information-hub', icon: Library },
];

// Intern navigation - same as employee except different dashboard and no payroll
const internNavItems: Array<NavItem> = [
  { label: 'Profile', href: '/intern/profile', icon: User },
  { label: 'Dashboard', href: '/intern/dashboard', icon: Home },
  { label: 'EOD Reports', href: '/intern/reports', icon: FileText },
  { label: 'Marketing Reports', href: '/reports', icon: FileText },
  { label: 'OKRs & KPIs', href: '/performance', icon: Target },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Company Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Self-Evaluation', href: '/performance/self-evaluation', icon: FileText },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Tickets', href: '/tickets', icon: LifeBuoy },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Checklist', href: '/onboarding', icon: ClipboardList },
  { label: 'Documents', href: '/files', icon: FolderOpen },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
  { label: 'Resources', href: '/information-hub', icon: Library },
];

// Admin (HR) navigation - includes team management features
const adminNavItems: Array<NavItem> = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: Home },
  { label: 'Directory', href: '/admin/directory', icon: Users },
  { label: 'Employee Management', href: '/admin/employee-management', icon: UserCog },
  { label: 'Intern Management', href: '/admin/interns', icon: GraduationCap },
  { label: 'Projects Tracker', href: '/admin/war-room', icon: FolderKanban },
  { label: 'Company Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'OKRs & KPIs', href: '/admin/performance', icon: Target },
  { label: 'Marketing Reports', href: '/admin/reports', icon: FileText },
  {
    label: 'Self-Evaluations',
    href: '/admin/performance/monthly-self-evaluations',
    icon: FileText,
  },
  { label: 'Recruitment', href: '/admin/recruitment', icon: Briefcase },
  { label: 'Jobs', href: '/admin/jobs', icon: Briefcase },
  { label: 'AI Knowledge', href: '/admin/ai-knowledge', icon: Sparkles },
  { label: 'Calendar', href: '/admin/calendar', icon: Calendar },
  { label: 'Checklists', href: '/admin/checklists', icon: ClipboardList },
  { label: 'Announcements', href: '/admin/announcements', icon: Megaphone },
  { label: 'Resources', href: '/admin/resources', icon: Library },
  { label: 'Tickets', href: '/admin/tickets', icon: LifeBuoy },
];

// Super Admin navigation - same as admin plus payroll approvals
const superAdminNavItems: Array<NavItem> = [
  { label: 'Dashboard', href: '/super-admin/dashboard', icon: Home },
  { label: 'Directory', href: '/admin/directory', icon: Users },
  { label: 'Employee Management', href: '/admin/employee-management', icon: UserCog },
  { label: 'Intern Management', href: '/admin/interns', icon: GraduationCap },
  { label: 'Projects Tracker', href: '/admin/war-room', icon: FolderKanban },
  { label: 'Company Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'OKRs & KPIs', href: '/admin/performance', icon: Target },
  { label: 'Marketing Reports', href: '/admin/reports', icon: FileText },
  {
    label: 'Self-Evaluations',
    href: '/admin/performance/monthly-self-evaluations',
    icon: FileText,
  },
  { label: 'Task Management', href: '/super-admin/tasks', icon: CheckSquare },
  { label: 'Payroll Approvals', href: '/super-admin/payroll-approvals', icon: FileCheck },
  { label: 'AI Knowledge', href: '/super-admin/ai-knowledge', icon: Sparkles },
  { label: 'Calendar', href: '/super-admin/calendar', icon: Calendar },
  { label: 'Checklists', href: '/super-admin/checklists', icon: ClipboardList },
  { label: 'Announcements', href: '/super-admin/announcements', icon: Megaphone },
  { label: 'Resources', href: '/super-admin/resources', icon: Library },
];

const exactOnlyNavHrefs = new Set([
  '/dashboard',
  '/intern/dashboard',
  '/admin/dashboard',
  '/super-admin/dashboard',
  '/',
]);

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }

  return path;
}

function getNavMatchLength(currentPath: string, href: string): number {
  const normalizedCurrentPath = normalizePath(currentPath);
  const normalizedHref = normalizePath(href);

  if (normalizedCurrentPath === normalizedHref) {
    return normalizedHref.length;
  }

  if (exactOnlyNavHrefs.has(normalizedHref)) {
    return -1;
  }

  return normalizedCurrentPath.startsWith(`${normalizedHref}/`) ? normalizedHref.length : -1;
}

export function Sidebar({
  variant,
  currentPath,
  onNavigate,
  logoUrl,
  collapsed = false,
  onToggleCollapse,
  showMarketingReports = true,
  showAtsAccess = false,
}: SidebarProps): React.ReactNode {
  const baseNavItems =
    variant === 'employee'
      ? employeeNavItems
      : variant === 'intern'
        ? internNavItems
        : variant === 'super_admin'
          ? superAdminNavItems
          : adminNavItems;

  const filteredNavItems = baseNavItems.filter((item) => {
    if (
      (variant === 'employee' || variant === 'intern') &&
      !showMarketingReports &&
      item.href === '/reports'
    ) {
      return false;
    }

    return true;
  });

  const navItems =
    (variant === 'employee' || variant === 'intern') && showAtsAccess
      ? [...filteredNavItems, ...employeeAtsNavItems]
      : filteredNavItems;

  const activeHref = navItems.reduce<{ href: string; matchLength: number } | null>(
    (bestMatch, item) => {
      const matchLength = getNavMatchLength(currentPath, item.href);

      if (matchLength === -1) {
        return bestMatch;
      }

      if (bestMatch === null || matchLength > bestMatch.matchLength) {
        return { href: item.href, matchLength };
      }

      return bestMatch;
    },
    null
  )?.href;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'relative flex h-screen flex-col flex-shrink-0 bg-card border-r border-border transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo Section */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-zinc-200 dark:border-zinc-800 px-4',
            collapsed ? 'justify-center' : 'justify-start gap-3'
          )}
        >
          <img
            src={logoUrl ?? '/sn-logo.png'}
            alt="SN International logo"
            width={60}
            height={10}
            className={cn('h-6 w-auto object-contain', collapsed && 'h-5')}
          />
          {!collapsed && (
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Control Hub
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeHref === item.href;
              const Icon = item.icon;

              const navButton = (
                <button
                  type="button"
                  onClick={() => onNavigate(item.href)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors relative',
                    isActive
                      ? 'text-zinc-900 dark:text-zinc-100 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-zinc-900 dark:before:bg-zinc-100 before:rounded-r'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-colors',
                      isActive
                        ? 'text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200'
                    )}
                    strokeWidth={1.5}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge !== undefined && (
                        <CountBadge variant="contrast" size="md">
                          {item.badge}
                        </CountBadge>
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
            className="group absolute -right-3 top-20 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-zinc-600 dark:text-zinc-400 shadow-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight
                className="h-4 w-4 text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                strokeWidth={1.5}
              />
            ) : (
              <ChevronLeft
                className="h-4 w-4 text-zinc-500 dark:text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                strokeWidth={1.5}
              />
            )}
          </button>
        )}

        {/* Footer - hidden when collapsed to prevent overlay on toggle button */}
        {!collapsed && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Where Policy Meets Productivity
            </p>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
