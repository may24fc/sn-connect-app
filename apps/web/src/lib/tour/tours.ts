import type { TourGuideStep } from '@sjmc11/tourguidejs/src/types/TourGuideStep';

/**
 * Tour step definitions for each major section of SN Connect.
 * Steps use CSS selectors to target elements on the page.
 * Groups are used to identify which tour to run for each section.
 */

// ──────────────────────────────────────────────────────────────
// Dashboard Tour (employee + admin)
// ──────────────────────────────────────────────────────────────
export const dashboardTourSteps: TourGuideStep[] = [
  {
    title: 'Welcome to SN Connect!',
    content:
      'This is your personal dashboard. Here you can see an overview of your tasks, announcements, and key metrics at a glance.',
    group: 'dashboard',
    order: 0,
  },
  {
    title: 'Sidebar Navigation',
    content:
      'Use the sidebar to navigate between sections like Profile, Tasks, Reports, and more. You can collapse it by clicking the arrow button.',
    target: 'aside',
    group: 'dashboard',
    order: 1,
  },
  {
    title: 'Quick Stats',
    content:
      'These cards show your key metrics: onboarding progress, probation status, tasks due, and notifications.',
    target: '[data-tour="stat-cards"]',
    group: 'dashboard',
    order: 2,
  },
  {
    title: 'Quick Actions',
    content:
      'Quickly upload files, submit reports, view your calendar, or request leave from here.',
    target: '[data-tour="quick-actions"]',
    group: 'dashboard',
    order: 3,
  },
  {
    title: 'Announcements',
    content: 'Stay up to date with the latest company announcements and important updates.',
    target: '[data-tour="announcements"]',
    group: 'dashboard',
    order: 4,
  },
  {
    title: 'Your Profile',
    content: 'Click your avatar in the top-right to access your profile, settings, or log out.',
    target: '[data-tour="user-menu"]',
    group: 'dashboard',
    order: 5,
  },
];

// ──────────────────────────────────────────────────────────────
// Profile Tour
// ──────────────────────────────────────────────────────────────
export const profileTourSteps: TourGuideStep[] = [
  {
    title: 'Your Profile',
    content:
      'This is your personal profile page. Keep your information up to date so HR and your team can reach you easily.',
    group: 'profile',
    order: 0,
  },
  {
    title: 'Edit Your Info',
    content:
      'Click on any editable field to update your personal information, contact details, or emergency contacts.',
    target: '[data-tour="profile-edit"]',
    group: 'profile',
    order: 1,
  },
  {
    title: 'Role Details',
    content:
      'View and manage your role-specific information here. You can add roles and update expertise details.',
    target: '[data-tour="profile-roles"]',
    group: 'profile',
    order: 2,
  },
  {
    title: 'Upload Photo',
    content:
      'Click your avatar to upload a new profile photo. Supported formats: JPG, PNG (max 5 MB).',
    target: '[data-tour="profile-avatar"]',
    group: 'profile',
    order: 3,
  },
];

// ──────────────────────────────────────────────────────────────
// Tasks Tour
// ──────────────────────────────────────────────────────────────
export const tasksTourSteps: TourGuideStep[] = [
  {
    title: 'Task Management',
    content:
      'View and manage all your assigned tasks here. Tasks are sorted by priority and due date.',
    group: 'tasks',
    order: 0,
  },
  {
    title: 'Create a Task',
    content: 'Click "New Task" to create a task for yourself or assign one to a team member.',
    target: '[data-tour="create-task"]',
    group: 'tasks',
    order: 1,
  },
  {
    title: 'Filter & Sort',
    content: 'Use filters to narrow down tasks by status, priority, category, or assignee.',
    target: '[data-tour="task-filters"]',
    group: 'tasks',
    order: 2,
  },
  {
    title: 'Task Details',
    content:
      'Click on any task to view its full details, add comments, update progress, or change status.',
    target: '[data-tour="task-list"]',
    group: 'tasks',
    order: 3,
  },
  {
    title: 'Task Comments',
    content:
      'Collaborate with your team by leaving comments on tasks. You can tag people and attach files.',
    target: '[data-tour="task-comments"]',
    group: 'tasks',
    order: 4,
  },
];

// ──────────────────────────────────────────────────────────────
// Admin Dashboard Tour
// ──────────────────────────────────────────────────────────────
export const adminDashboardTourSteps: TourGuideStep[] = [
  {
    title: 'Admin Dashboard',
    content:
      "Welcome to the Admin Dashboard. Get a bird's-eye view of employees, interns, and organizational metrics.",
    group: 'admin-dashboard',
    order: 0,
  },
  {
    title: 'Workforce Overview',
    content:
      'These stat cards show total employees, active interns, and upcoming reviews at a glance.',
    target: '[data-tour="stat-cards"]',
    group: 'admin-dashboard',
    order: 1,
  },
  {
    title: 'Department Overview',
    content: 'View headcount and status breakdowns by department.',
    target: '[data-tour="department-overview"]',
    group: 'admin-dashboard',
    order: 2,
  },
  {
    title: 'Upcoming Milestones',
    content: 'Track birthdays and work anniversaries for your team. Never miss a celebration!',
    target: '[data-tour="milestones"]',
    group: 'admin-dashboard',
    order: 3,
  },
  {
    title: 'Quick Actions',
    content: 'Jump to Employee Management, Performance Reviews, Recruitment, or Reports from here.',
    target: '[data-tour="quick-actions"]',
    group: 'admin-dashboard',
    order: 4,
  },
];

// ──────────────────────────────────────────────────────────────
// Map of tour group name to its steps
// ──────────────────────────────────────────────────────────────
export const tourStepsByGroup: Record<string, TourGuideStep[]> = {
  dashboard: dashboardTourSteps,
  profile: profileTourSteps,
  tasks: tasksTourSteps,
  'admin-dashboard': adminDashboardTourSteps,
};

/**
 * Get tour steps for the current page path.
 * Returns undefined if no tour is defined for the path.
 */
export function getTourGroupForPath(pathname: string): string | undefined {
  if (pathname === '/dashboard' || pathname === '/intern/dashboard') {
    return 'dashboard';
  }
  if (pathname === '/profile') {
    return 'profile';
  }
  if (pathname.startsWith('/tasks')) {
    return 'tasks';
  }
  if (pathname === '/admin/dashboard' || pathname === '/super-admin/dashboard') {
    return 'admin-dashboard';
  }
  return undefined;
}

/** localStorage key prefix for tracking completed tours */
export const TOUR_STORAGE_PREFIX = 'sn-tour-finished-';

/** Check if a tour group has been completed */
export function isTourCompleted(group: string): boolean {
  try {
    return localStorage.getItem(`${TOUR_STORAGE_PREFIX}${group}`) === 'true';
  } catch {
    return false;
  }
}

/** Mark a tour group as completed */
export function markTourCompleted(group: string): void {
  try {
    localStorage.setItem(`${TOUR_STORAGE_PREFIX}${group}`, 'true');
  } catch {
    // ignore in SSR / private browsing
  }
}

/** Reset a specific tour so it can be replayed */
export function resetTour(group: string): void {
  try {
    localStorage.removeItem(`${TOUR_STORAGE_PREFIX}${group}`);
  } catch {
    // ignore
  }
}

/** Reset all tours */
export function resetAllTours(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(TOUR_STORAGE_PREFIX));
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
