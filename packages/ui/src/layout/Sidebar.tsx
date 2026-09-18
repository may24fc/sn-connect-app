'use client';

import {
  Briefcase,
  Building2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Factory,
  FileCheck,
  FileText,
  FolderKanban,
  FolderOpen,
  HeartPulse,
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
  UserCog,
  Users,
} from 'lucide-react';
import type * as React from 'react';
import { CountBadge } from '../primitives/count-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../primitives/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../primitives/tooltip';
import { cn } from '../utils/cn';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  activeFor?: Array<string>;
}

interface NavSection {
  title?: string;
  items: Array<NavItem>;
}

type WorkspaceId = 'internal' | 'pa' | 'sfo';

interface WorkspaceOption {
  id: WorkspaceId | 'uhp' | 'property';
  label: string;
  description: string;
  icon: LucideIcon;
  comingSoon?: boolean;
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
  {
    label: 'Recruitment',
    href: '/ats/recruitment',
    icon: Briefcase,
    activeFor: ['/ats/jobs'],
  },
];

// Employee navigation
const employeeNavItems: Array<NavItem> = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Marketing Reports', href: '/reports', icon: FileText },
  {
    label: 'OKRs & KPIs',
    href: '/performance',
    icon: Target,
    activeFor: ['/performance/self-evaluation', '/my-performance'],
  },
  { label: 'Invoice', href: '/invoice', icon: Receipt },
  { label: 'Expenses', href: '/expenses', icon: Receipt },
  { label: 'AI Spending', href: '/ai-spending', icon: Sparkles },
  { label: 'Expenses Desk', href: '/expenses/desk', icon: Receipt },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Tickets', href: '/tickets', icon: LifeBuoy },
  { label: 'Documents', href: '/files', icon: FolderOpen },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
  { label: 'Resources', href: '/information-hub', icon: Library },
];

// Associate navigation - same as employee except different dashboard and no payroll
const internNavItems: Array<NavItem> = [
  { label: 'Dashboard', href: '/associate/dashboard', icon: Home },
  { label: 'EOD Reports', href: '/associate/reports', icon: FileText },
  { label: 'Marketing Reports', href: '/reports', icon: FileText },
  {
    label: 'OKRs & KPIs',
    href: '/performance',
    icon: Target,
    activeFor: ['/performance/self-evaluation', '/my-performance'],
  },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Expenses', href: '/expenses', icon: Receipt },
  { label: 'AI Spending', href: '/ai-spending', icon: Sparkles },
  { label: 'Expenses Desk', href: '/expenses/desk', icon: Receipt },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Tickets', href: '/tickets', icon: LifeBuoy },
  { label: 'Documents', href: '/files', icon: FolderOpen },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
  { label: 'Resources', href: '/information-hub', icon: Library },
];

// Admin (HR) navigation - includes team management features
const adminNavItems: Array<NavItem> = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: Home },
  { label: 'Directory', href: '/admin/directory', icon: Users },
  {
    label: 'Employee Management',
    href: '/admin/employee-management',
    icon: UserCog,
    activeFor: ['/admin/checklists', '/admin/onboarding', '/admin/probation'],
  },
  { label: 'Associate Management', href: '/admin/interns', icon: Users },
  { label: 'Invoice', href: '/admin/invoice', icon: Receipt },
  { label: 'Projects Tracker', href: '/admin/war-room', icon: FolderKanban },
  {
    label: 'OKRs & KPIs',
    href: '/admin/performance',
    icon: Target,
    activeFor: ['/admin/performance/monthly-self-evaluations'],
  },
  { label: 'Marketing Reports', href: '/admin/reports', icon: FileText },
  { label: 'Ad Spend', href: '/admin/marketing/ad-spend', icon: Megaphone },
  { label: 'CRM Tracker', href: '/admin/crm', icon: Store },
  { label: 'Expenses Desk', href: '/admin/expenses', icon: Receipt },
  {
    label: 'Recruitment',
    href: '/admin/recruitment',
    icon: Briefcase,
    activeFor: ['/admin/jobs'],
  },
  { label: 'AI Spending', href: '/ai-spending', icon: Sparkles },
  {
    label: 'Resources',
    href: '/admin/resources',
    icon: Library,
    activeFor: ['/admin/ai-knowledge'],
  },
  { label: 'Announcements', href: '/admin/announcements', icon: Megaphone },
  { label: 'Tickets', href: '/admin/tickets', icon: LifeBuoy },
];

// Super Admin navigation - same as admin plus payroll approvals
const superAdminNavItems: Array<NavItem> = [
  { label: 'Dashboard', href: '/super-admin/dashboard', icon: Home },
  { label: 'Directory', href: '/admin/directory', icon: Users },
  {
    label: 'Employee Management',
    href: '/admin/employee-management',
    icon: UserCog,
    activeFor: ['/admin/checklists', '/admin/onboarding', '/admin/probation'],
  },
  { label: 'Associate Management', href: '/admin/interns', icon: Users },
  { label: 'Invoice', href: '/admin/invoice', icon: Receipt },
  { label: 'Projects Tracker', href: '/admin/war-room', icon: FolderKanban },
  {
    label: 'OKRs & KPIs',
    href: '/admin/performance',
    icon: Target,
    activeFor: ['/admin/performance/monthly-self-evaluations'],
  },
  { label: 'Marketing Reports', href: '/admin/reports', icon: FileText },
  { label: 'Ad Spend', href: '/admin/marketing/ad-spend', icon: Megaphone },
  { label: 'Revenue Forecast', href: '/super-admin/revenue-forecast', icon: TrendingUp },
  { label: 'CRM Tracker', href: '/admin/crm', icon: Store },
  { label: 'Expenses Desk', href: '/admin/expenses', icon: Receipt },
  { label: 'Task Management', href: '/super-admin/tasks', icon: CheckSquare },
  { label: 'Payroll Approvals', href: '/super-admin/payroll-approvals', icon: FileCheck },
  { label: 'AI Spending', href: '/ai-spending', icon: Sparkles },
  {
    label: 'Resources',
    href: '/super-admin/resources',
    icon: Library,
    activeFor: ['/super-admin/ai-knowledge', '/admin/ai-knowledge'],
  },
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

const adminInternalSectionConfig: ReadonlyArray<{
  title: string;
  hrefs: ReadonlyArray<string>;
}> = [
  {
    title: 'People',
    hrefs: [
      '/admin/directory',
      '/admin/employee-management',
      '/admin/interns',
      '/admin/recruitment',
    ],
  },
  {
    title: 'Work & Performance',
    hrefs: ['/admin/performance', '/admin/war-room', '/super-admin/tasks'],
  },
  {
    title: 'Finance',
    hrefs: ['/admin/expenses', '/ai-spending', '/admin/invoice', '/super-admin/payroll-approvals'],
  },
  {
    title: 'Knowledge & Support',
    hrefs: [
      '/admin/resources',
      '/super-admin/resources',
      '/admin/announcements',
      '/super-admin/announcements',
      '/admin/tickets',
    ],
  },
];

const selfServiceInternalSectionConfig: ReadonlyArray<{
  title: string;
  hrefs: ReadonlyArray<string>;
}> = [
  {
    title: 'My Work',
    hrefs: ['/tasks', '/projects', '/associate/reports', '/ats/recruitment', '/performance'],
  },
  {
    title: 'Finance',
    hrefs: ['/invoice', '/expenses', '/expenses/desk', '/ai-spending'],
  },
  {
    title: 'Knowledge & Support',
    hrefs: ['/files', '/announcements', '/information-hub', '/tickets'],
  },
];

const sfoSectionConfig: ReadonlyArray<{ title: string; hrefs: ReadonlyArray<string> }> = [
  {
    title: 'SFO Operations',
    hrefs: [
      '/reports',
      '/admin/reports',
      '/marketing/ad-spend',
      '/admin/marketing/ad-spend',
      '/revenue-forecast',
      '/super-admin/revenue-forecast',
      '/crm',
      '/admin/crm',
    ],
  },
];

const paSectionConfig: ReadonlyArray<{ title: string; hrefs: ReadonlyArray<string> }> = [
  { title: 'PA Operations', hrefs: ['/pa-tasks'] },
];

const workspaceOptions: [WorkspaceOption, ...Array<WorkspaceOption>] = [
  {
    id: 'internal',
    label: 'Internal Management',
    description: 'People, finance, performance, and shared operations',
    icon: Building2,
  },
  {
    id: 'pa',
    label: 'Personal Assistants',
    description: 'PA task and executive support operations',
    icon: ClipboardList,
  },
  {
    id: 'sfo',
    label: 'Seafood Factory Outlet',
    description: 'Marketing and commercial operations',
    icon: Factory,
  },
  {
    id: 'uhp',
    label: 'Ultimate Health Project',
    description: 'Coming soon',
    icon: HeartPulse,
    comingSoon: true,
  },
  {
    id: 'property',
    label: 'Property Development',
    description: 'Coming soon',
    icon: Building2,
    comingSoon: true,
  },
];

function getWorkspaceForPath(path: string): WorkspaceId {
  const normalizedPath = normalizePath(path);
  if (normalizedPath === '/pa-tasks' || normalizedPath.startsWith('/pa-tasks/')) return 'pa';

  const sfoPrefixes = [
    '/reports',
    '/admin/reports',
    '/marketing/ad-spend',
    '/admin/marketing/ad-spend',
    '/crm',
    '/admin/crm',
    '/revenue-forecast',
    '/super-admin/revenue-forecast',
  ];
  if (
    sfoPrefixes.some(
      (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
    )
  ) {
    return 'sfo';
  }

  return 'internal';
}

function createWorkspaceSections(
  variant: UserRole,
  navItems: Array<NavItem>,
  workspace: WorkspaceId
): Array<NavSection> {
  const sectionConfig =
    workspace === 'sfo'
      ? sfoSectionConfig
      : workspace === 'pa'
        ? paSectionConfig
        : variant === 'admin' || variant === 'super_admin'
          ? adminInternalSectionConfig
          : selfServiceInternalSectionConfig;

  const itemByHref = new Map(navItems.map((item) => [item.href, item]));
  const sections: Array<NavSection> = [];

  for (const config of sectionConfig) {
    const sectionItems = config.hrefs
      .map((href) => itemByHref.get(href))
      .filter((item): item is NavItem => item !== undefined);

    if (sectionItems.length > 0) {
      sections.push({ title: config.title, items: sectionItems });
    }
  }

  return sections;
}

function isSelfServiceRole(variant: UserRole): boolean {
  return variant === 'employee' || variant === 'associate';
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

    if (isSelfServiceRole(variant) && !showMarketingReports && item.href === '/reports') {
      return false;
    }

    if (isSelfServiceRole(variant) && !showExpenseDeskAccess && item.href === '/expenses/desk') {
      return false;
    }

    if (isSelfServiceRole(variant) && !showAiSpendingAccess && item.href === '/ai-spending') {
      return false;
    }

    return true;
  });

  let navItems =
    isSelfServiceRole(variant) && showAtsAccess
      ? [...filteredNavItems, ...employeeAtsNavItems]
      : filteredNavItems;

  if (
    isSelfServiceRole(variant) ? showPaTaskAccess : variant === 'admin' || variant === 'super_admin'
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
  if (isSelfServiceRole(variant) && showMarketingAdSpendAccess) {
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
  if (isSelfServiceRole(variant) && showCrmAccess) {
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

  if (isSelfServiceRole(variant) && showRevenueForecastAccess) {
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
      const matchLength = [item.href, ...(item.activeFor ?? [])].reduce(
        (best, href) => Math.max(best, getNavMatchLength(currentPath, href)),
        -1
      );

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
  const dashboardItem = navItems.find((item) => exactOnlyNavHrefs.has(item.href));
  const workspaceItems = navItems.filter((item) => item !== dashboardItem);
  const requestedWorkspace = getWorkspaceForPath(currentPath);
  const availableWorkspaceOptions = workspaceOptions.filter((option) => {
    if (option.id === 'uhp' || option.id === 'property' || option.id === 'internal') return true;
    return createWorkspaceSections(variant, workspaceItems, option.id).length > 0;
  });
  const activeWorkspace = availableWorkspaceOptions.some(
    (option) => option.id === requestedWorkspace && !option.comingSoon
  )
    ? requestedWorkspace
    : 'internal';
  const activeWorkspaceOption =
    availableWorkspaceOptions.find((option) => option.id === activeWorkspace) ??
    workspaceOptions[0];
  const ActiveWorkspaceIcon = activeWorkspaceOption.icon;
  const navSections = createWorkspaceSections(variant, workspaceItems, activeWorkspace);

  const handleWorkspaceSelect = (workspace: WorkspaceOption): void => {
    if (workspace.id === 'uhp' || workspace.id === 'property') return;
    if (workspace.id === 'internal') {
      if (dashboardItem) onNavigate(dashboardItem.href);
      return;
    }

    const firstItem = createWorkspaceSections(variant, workspaceItems, workspace.id)[0]?.items[0];
    if (firstItem) onNavigate(firstItem.href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'relative flex h-dvh flex-shrink-0 flex-col border-r border-[rgb(var(--sidebar-border))] bg-[rgb(var(--sidebar-bg))] text-white shadow-[4px_0_18px_rgb(10_43_54/0.08)] transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo Section */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-white/10 px-4',
            collapsed ? 'justify-center' : 'justify-start gap-3'
          )}
        >
          <img
            src={logoUrl ?? '/sn-logo.png'}
            alt="SN International logo"
            width={60}
            height={10}
            className={cn('h-7 w-auto rounded bg-white/95 px-1.5 py-1 object-contain', collapsed && 'h-7')}
          />
          {!collapsed && (
            <span className="font-heading text-lg font-semibold tracking-tight text-white">
              Control Hub
            </span>
          )}
        </div>

        {/* Global dashboard */}
        {dashboardItem ? (
          <div className="px-3 pt-4">
            <button
              type="button"
              onClick={() => onNavigate(dashboardItem.href)}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                activeHref === dashboardItem.href
                  ? 'bg-white/12 text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-r before:bg-[rgb(var(--metallic))]'
                  : 'text-white/70 hover:bg-white/8 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
            >
              <Home className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              {!collapsed ? <span>Dashboard</span> : null}
            </button>
          </div>
        ) : null}

        {/* Workspace switcher */}
        <div className="px-3 pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Current workspace: ${activeWorkspaceOption.label}`}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border border-white/15 bg-white/8 px-3 py-2.5 text-left transition-colors hover:border-white/25 hover:bg-white/12',
                  collapsed && 'justify-center px-2'
                )}
              >
                <ActiveWorkspaceIcon className="h-5 w-5 shrink-0 text-[#C2DDE5]" />
                {!collapsed ? (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-white/55">
                        Workspace
                      </span>
                      <span className="block truncate text-sm font-semibold text-white">
                        {activeWorkspaceOption.label}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 rotate-90 text-white/55" />
                  </>
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={collapsed ? 'start' : 'center'}
              side={collapsed ? 'right' : 'bottom'}
              className="w-72"
            >
              <DropdownMenuLabel>Choose workspace</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableWorkspaceOptions.map((workspace) => {
                const WorkspaceIcon = workspace.icon;
                return (
                  <DropdownMenuItem
                    disabled={workspace.comingSoon === true}
                    key={workspace.id}
                    onSelect={() => handleWorkspaceSelect(workspace)}
                    className="gap-3 py-2.5"
                  >
                    <WorkspaceIcon className="h-5 w-5 shrink-0 text-zinc-500" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-medium">
                        {workspace.label}
                        {workspace.comingSoon ? (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            Coming soon
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {workspace.description}
                      </span>
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-4">
            {navSections.map((section) => (
              <li key={section.title ?? 'default'}>
                {!collapsed && section.title && (
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">
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
                            ? 'bg-white/12 text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-r before:bg-[rgb(var(--metallic))]'
                            : 'text-white/70 hover:bg-white/8 hover:text-white',
                          collapsed && 'justify-center px-2'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5 flex-shrink-0 transition-colors',
                            isActive
                              ? 'text-[#C2DDE5]'
                              : 'text-white/55 group-hover:text-white'
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
            className="group absolute -right-3 top-20 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[rgb(var(--sidebar-bg))] text-white shadow-sm transition-colors hover:bg-primary"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight
                className="h-4 w-4 text-white/70 transition-colors group-hover:text-white"
                strokeWidth={1.5}
              />
            ) : (
              <ChevronLeft
                className="h-4 w-4 text-white/70 transition-colors group-hover:text-white"
                strokeWidth={1.5}
              />
            )}
          </button>
        )}

        {/* Footer - hidden when collapsed to prevent overlay on toggle button */}
        {!collapsed && (
          <div className="border-t border-white/10 p-4">
            <p className="text-xs text-white/50">
              Where Policy Meets Productivity
            </p>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
