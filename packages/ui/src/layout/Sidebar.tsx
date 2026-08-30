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
  Store,
  Target,
  TrendingUp,
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

interface NavSection {
  title?: string;
  items: Array<NavItem>;
}

export type UserRole = 'employee' | 'associate' | 'admin' | 'super_admin';

export interface SidebarProps {
  variant: UserRole;
  currentPath: string;
  onNavigate: (href: string) => void;
  logoUrl?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  showMarketingReports?: boolean;
  showAtsAccess?: boolean;
  showPaTaskAccess?: boolean;
  showCrmAccess?: boolean;
  showMarketingAdSpendAccess?: boolean;
  showRevenueForecastAccess?: boolean;
  showExpenseDeskAccess?: boolean;
  showAiSpendingAccess?: boolean;
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
  { label: 'Evaluations', href: '/performance/self-evaluation', icon: FileText },
  { label: 'Invoice', href: '/invoice', icon: Receipt },
  { label: 'Expenses', href: '/expenses', icon: Receipt },
  { label: 'AI Spending', href: '/ai-spending', icon: Sparkles },
  { label: 'Expenses Desk', href: '/expenses/desk', icon: Receipt },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Tickets', href: '/tickets', icon: LifeBuoy },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Checklist', href: '/onboarding', icon: ClipboardList },
  { label: 'Documents', href: '/files', icon: FolderOpen },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
  { label: 'Resources', href: '/information-hub', icon: Library },
];

// Associate navigation - same as employee except different dashboard and no payroll
const internNavItems: Array<NavItem> = [
  { label: 'Profile', href: '/associate/profile', icon: User },
  { label: 'Dashboard', href: '/associate/dashboard', icon: Home },
  { label: 'EOD Reports', href: '/associate/reports', icon: FileText },
  { label: 'Marketing Reports', href: '/reports', icon: FileText },
  { label: 'OKRs & KPIs', href: '/performance', icon: Target },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Company Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Evaluations', href: '/performance/self-evaluation', icon: FileText },
  { label: 'Expenses', href: '/expenses', icon: Receipt },
  { label: 'AI Spending', href: '/ai-spending', icon: Sparkles },
  { label: 'Expenses Desk', href: '/expenses/desk', icon: Receipt },
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
  { label: 'Associate Management', href: '/admin/interns', icon: GraduationCap },
  { label: 'Invoice', href: '/admin/invoice', icon: Receipt },
  { label: 'Projects Tracker', href: '/admin/war-room', icon: FolderKanban },
  { label: 'Company Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'OKRs & KPIs', href: '/admin/performance', icon: Target },
  { label: 'Marketing Reports', href: '/admin/reports', icon: FileText },
  { label: 'Ad Spend', href: '/admin/marketing/ad-spend', icon: Megaphone },
  { label: 'CRM Tracker', href: '/admin/crm', icon: Store },
  { label: 'Expenses Desk', href: '/admin/expenses', icon: Receipt },
  {
    label: 'Evaluation',
    href: '/admin/performance/monthly-self-evaluations',
    icon: FileText,
  },
  { label: 'Recruitment', href: '/admin/recruitment', icon: Briefcase },
  { label: 'Jobs', href: '/admin/jobs', icon: Briefcase },
  { label: 'AI Spending', href: '/ai-spending', icon: Sparkles },
  { label: 'AI Knowledge', href: '/admin/ai-knowledge', icon: Sparkles },
  { label: 'Resources', href: '/admin/resources', icon: Library },
  { label: 'Calendar', href: '/admin/calendar', icon: Calendar },
  { label: 'Checklists', href: '/admin/checklists', icon: ClipboardList },
  { label: 'Announcements', href: '/admin/announcements', icon: Megaphone },
  { label: 'Tickets', href: '/admin/tickets', icon: LifeBuoy },
];

// Super Admin navigation - same as admin plus payroll approvals
const superAdminNavItems: Array<NavItem> = [
  { label: 'Dashboard', href: '/super-admin/dashboard', icon: Home },
  { label: 'Directory', href: '/admin/directory', icon: Users },
  { label: 'Employee Management', href: '/admin/employee-management', icon: UserCog },
  { label: 'Associate Management', href: '/admin/interns', icon: GraduationCap },
  { label: 'Invoice', href: '/admin/invoice', icon: Receipt },
  { label: 'Projects Tracker', href: '/admin/war-room', icon: FolderKanban },
  { label: 'Company Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'OKRs & KPIs', href: '/admin/performance', icon: Target },
  { label: 'Marketing Reports', href: '/admin/reports', icon: FileText },
  { label: 'Ad Spend', href: '/admin/marketing/ad-spend', icon: Megaphone },
  { label: 'Revenue Forecast', href: '/super-admin/revenue-forecast', icon: TrendingUp },
  { label: 'CRM Tracker', href: '/admin/crm', icon: Store },
  { label: 'Expenses Desk', href: '/admin/expenses', icon: Receipt },
  {
    label: 'Evaluations',
    href: '/admin/performance/monthly-self-evaluations',
    icon: FileText,
  },
  { label: 'Task Management', href: '/super-admin/tasks', icon: CheckSquare },
  { label: 'Payroll Approvals', href: '/super-admin/payroll-approvals', icon: FileCheck },
  { label: 'AI Spending', href: '/ai-spending', icon: Sparkles },
  { label: 'AI Knowledge', href: '/super-admin/ai-knowledge', icon: Sparkles },
  { label: 'Resources', href: '/super-admin/resources', icon: Library },
  { label: 'Calendar', href: '/super-admin/calendar', icon: Calendar },
  { label: 'Checklists', href: '/super-admin/checklists', icon: ClipboardList },
  { label: 'Announcements', href: '/super-admin/announcements', icon: Megaphone },
];

const exactOnlyNavHrefs = new Set([
  '/dashboard',
  '/associate/dashboard',
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

const adminSectionConfig: ReadonlyArray<{ title: string; hrefs: ReadonlyArray<string> }> = [
  {
    title: 'Overview',
    hrefs: ['/admin/dashboard', '/super-admin/dashboard'],
  },
  {
    title: 'People Operations',
    hrefs: [
      '/admin/directory',
      '/admin/employee-management',
      '/admin/interns',
      '/admin/recruitment',
      '/admin/jobs',
      '/admin/checklists',
      '/admin/calendar',
      '/super-admin/calendar',
    ],
  },
  {
    title: 'Performance & Culture',
    hrefs: [
      '/admin/performance',
      '/admin/performance/monthly-self-evaluations',
      '/leaderboard',
      '/admin/announcements',
      '/super-admin/announcements',
    ],
  },
  {
    title: 'Commercial & Finance',
    hrefs: [
      '/admin/reports',
      '/admin/marketing/ad-spend',
      '/admin/crm',
      '/super-admin/revenue-forecast',
      '/admin/expenses',
      '/ai-spending',
      '/admin/invoice',
      '/super-admin/payroll-approvals',
    ],
  },
  {
    title: 'Delivery & Work Management',
    hrefs: ['/admin/war-room', '/super-admin/tasks', '/pa-tasks'],
  },
  {
    title: 'Knowledge & Support',
    hrefs: [
      '/admin/ai-knowledge',
      '/super-admin/ai-knowledge',
      '/admin/resources',
      '/super-admin/resources',
      '/admin/tickets',
    ],
  },
];

function createRoleBasedSections(variant: UserRole, navItems: Array<NavItem>): Array<NavSection> {
  if (variant !== 'admin' && variant !== 'super_admin') {
    return [{ items: navItems }];
  }

  const itemByHref = new Map(navItems.map((item) => [item.href, item]));
  const usedHrefs = new Set<string>();
  const sections: Array<NavSection> = [];

  for (const config of adminSectionConfig) {
    const sectionItems = config.hrefs
      .map((href) => itemByHref.get(href))
      .filter((item): item is NavItem => item !== undefined);

    if (sectionItems.length > 0) {
      sections.push({ title: config.title, items: sectionItems });
      for (const item of sectionItems) {
        usedHrefs.add(item.href);
      }
    }
  }

  const remainingItems = navItems.filter((item) => !usedHrefs.has(item.href));
  if (remainingItems.length > 0) {
    sections.push({ title: 'Other', items: remainingItems });
  }

  return sections;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Existing role-based navigation and conditional visibility logic is intentionally centralized.
export function Sidebar({
  variant,
  currentPath,
  onNavigate,
  logoUrl,
  collapsed = false,
  onToggleCollapse,
  showMarketingReports = true,
  showAtsAccess = false,
  showPaTaskAccess = false,
  showCrmAccess = false,
  showMarketingAdSpendAccess = false,
  showRevenueForecastAccess = false,
  showExpenseDeskAccess = true,
  showAiSpendingAccess = true,
}: SidebarProps): React.ReactNode {
  const baseNavItems =
    variant === 'employee'
      ? employeeNavItems
      : variant === 'associate'
        ? internNavItems
        : variant === 'super_admin'
          ? superAdminNavItems
          : adminNavItems;

  const filteredNavItems = baseNavItems.filter((item) => {
    if (variant === 'employee' && (item.href === '/projects' || item.href === '/leaderboard')) {
      return false;
    }

    if (
      (variant === 'employee' || variant === 'associate') &&
      !showMarketingReports &&
      item.href === '/reports'
    ) {
      return false;
    }

    if (
      (variant === 'employee' || variant === 'associate') &&
      !showExpenseDeskAccess &&
      item.href === '/expenses/desk'
    ) {
      return false;
    }

    if (
      (variant === 'employee' || variant === 'associate') &&
      !showAiSpendingAccess &&
      item.href === '/ai-spending'
    ) {
      return false;
    }

    return true;
  });

  let navItems =
    (variant === 'employee' || variant === 'associate') && showAtsAccess
      ? [...filteredNavItems, ...employeeAtsNavItems]
      : filteredNavItems;

  if (
    variant === 'employee' || variant === 'associate'
      ? showPaTaskAccess
      : variant === 'admin' || variant === 'super_admin'
  ) {
    const paTaskItem: NavItem = { label: 'PA Tracker', href: '/pa-tasks', icon: ClipboardList };
    const tasksIndex = navItems.findIndex(
      (it) => it.href === '/tasks' || it.href === '/super-admin/tasks'
    );
    if (tasksIndex >= 0) {
      navItems = [
        ...navItems.slice(0, tasksIndex + 1),
        paTaskItem,
        ...navItems.slice(tasksIndex + 1),
      ];
    } else {
      navItems = [...navItems, paTaskItem];
    }
  }

  // Insert CRM nav item for granted non-admin users directly below Marketing Reports
  if ((variant === 'employee' || variant === 'associate') && showMarketingAdSpendAccess) {
    const adSpendItem: NavItem = {
      label: 'Ad Spend',
      href: '/marketing/ad-spend',
      icon: Megaphone,
    };
    const reportsIndex = navItems.findIndex((it) => it.href === '/reports');
    if (reportsIndex >= 0) {
      navItems = [
        ...navItems.slice(0, reportsIndex + 1),
        adSpendItem,
        ...navItems.slice(reportsIndex + 1),
      ];
    } else {
      navItems = [...navItems, adSpendItem];
    }
  }

  // Insert CRM nav item for granted non-admin users directly below Marketing Reports
  if ((variant === 'employee' || variant === 'associate') && showCrmAccess) {
    const crmItem: NavItem = { label: 'CRM Tracker', href: '/crm', icon: Store };
    const reportsIndex = navItems.findIndex((it) => it.href === '/reports');
    if (reportsIndex >= 0) {
      navItems = [
        ...navItems.slice(0, reportsIndex + 1),
        crmItem,
        ...navItems.slice(reportsIndex + 1),
      ];
    } else {
      // fallback to append if Reports is not present (edge case)
      navItems = [...navItems, crmItem];
    }
  }

  if ((variant === 'employee' || variant === 'associate') && showRevenueForecastAccess) {
    const revenueItem: NavItem = {
      label: 'Revenue Forecast',
      href: '/revenue-forecast',
      icon: TrendingUp,
    };
    const reportsIndex = navItems.findIndex((it) => it.href === '/reports');
    if (reportsIndex >= 0) {
      navItems = [
        ...navItems.slice(0, reportsIndex + 1),
        revenueItem,
        ...navItems.slice(reportsIndex + 1),
      ];
    } else {
      navItems = [...navItems, revenueItem];
    }
  }

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
  const navSections = createRoleBasedSections(variant, navItems);

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
          <ul className="space-y-4">
            {navSections.map((section) => (
              <li key={section.title ?? 'default'}>
                {!collapsed && section.title && (
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {section.title}
                  </p>
                )}
                <ul className="space-y-1">
                  {section.items.map((item) => {
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
              </li>
            ))}
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
