import type { ModalTourStep } from '@/components/TourModal';

/**
 * Modal-based tour definitions for each major section of Control Hub.
 * Each step includes title, description, and optional screenshot/video URLs.
 * No DOM targeting - just beautiful modals with screenshots!
 */

// ──────────────────────────────────────────────────────────────
// Dashboard Tour (employee + admin)
// ──────────────────────────────────────────────────────────────
export const dashboardTourSteps: ModalTourStep[] = [
  {
    title: 'Welcome to Control Hub!',
    description:
      'Welcome to your personalized HR portal! This is your personal dashboard where you can see an overview of your tasks, announcements, and key metrics at a glance. Think of this as your command center for everything HR-related.',
    imageUrl: '/tour/dashboard-welcome.png',
  },
  {
    title: 'Quick Navigation Sidebar',
    description:
      'The sidebar on the left gives you access to all major sections: Dashboard, Profile, Tasks, Marketing Reports, Documents, and more. You can collapse it to give yourself more screen space by clicking the collapse button.',
    imageUrl: '/tour/dashboard-sidebar.png',
  },
  {
    title: 'Your Key Metrics',
    description:
      'These stat cards show you the most important information at a glance: your onboarding progress, probation status, tasks due today, and any new notifications. They update in real-time.',
    imageUrl: '/tour/dashboard-stats.png',
  },
  {
    title: 'Announcements',
    description:
      'Stay informed with announcements from HR and leadership team. This section shows the latest company-wide updates, policy changes, and important dates. Click on any announcement to read the full details.',
    imageUrl: '/tour/dashboard-announcements.png',
  },
  {
    title: 'Access Your Profile',
    description:
      'Click on your avatar in the top-right corner to access your profile, account settings, help and support, or log out. Your profile is where you can update your personal information and upload your photo.',
    imageUrl: '/tour/dashboard-profile.png',
  },
];

// ──────────────────────────────────────────────────────────────
// Profile Tour
// ──────────────────────────────────────────────────────────────
export const profileTourSteps: ModalTourStep[] = [
  {
    title: 'Your Profile Page',
    description:
      'This is your personal profile page - your HR profile on the platform. Keep all your information here up to date so that HR, your manager, and your colleagues can reach you easily and have accurate contact information.',
    imageUrl: '/tour/profile-overview.png',
  },
  {
    title: 'Upload Your Photo',
    description:
      'Add a professional photo to your profile by clicking your avatar. This helps your team recognize you and makes the company directory more personal. Supported formats: JPG, PNG. Maximum file size: 5 MB.',
    imageUrl: '/tour/profile-photo.png',
  },
  {
    title: 'Edit Your Information',
    description:
      'Keep your contact details, address, phone number, and emergency contacts up to date. Click the Edit button to modify any field. Remember to save your changes when done.',
    imageUrl: '/tour/profile-edit.png',
  },
  {
    title: 'Role & Responsibilities',
    description:
      'This section shows your current role(s), department, and responsibilities. If you have multiple roles, you can view and manage them all here.',
    imageUrl: '/tour/profile-roles.png',
  },
  {
    title: 'Employment Details',
    description:
      'View important employment information including your hire date, employment type, work arrangement, and tenure. These details are maintained by HR.',
    imageUrl: '/tour/profile-employment.png',
  },
];

// ──────────────────────────────────────────────────────────────
// Tasks Tour
// ──────────────────────────────────────────────────────────────
export const tasksTourSteps: ModalTourStep[] = [
  {
    title: 'Task Management Center',
    description:
      'This is your task management center. Here you can view all your assigned tasks, create new ones, and collaborate with your team. Tasks are sorted by priority and due date so you never miss a deadline.',
    imageUrl: '/tour/tasks-overview.png',
  },
  {
    title: 'Create New Tasks',
    description:
      'Use the "New Task" button to create a task for yourself or assign one to a team member. You can set priority, due dates, tags, and assign to specific people. New tasks appear immediately in the list.',
    imageUrl: '/tour/tasks-create.png',
  },
  {
    title: 'Filter & Sort Your Tasks',
    description:
      'Use the filter panel to narrow down tasks by status (To Do, In Progress, Done), priority (High, Medium, Low), category, or assignee. You can also search for specific tasks or sort by due date.',
    imageUrl: '/tour/tasks-filter.png',
  },
  {
    title: 'Task Details & Updates',
    description:
      'Click on any task card to open its details. Here you can update the status, add comments for collaboration, change priority, adjust due dates, or attach files. Your team sees updates in real-time.',
    imageUrl: '/tour/tasks-details.png',
  },
  {
    title: 'Collaborate with Comments',
    description:
      'Leave comments on tasks to discuss progress with your team. You can @mention colleagues, attach files, and track the full conversation history. Great for async communication!',
    imageUrl: '/tour/tasks-comments.png',
  },
];

// ──────────────────────────────────────────────────────────────
// Admin Dashboard Tour
// ──────────────────────────────────────────────────────────────
export const adminDashboardTourSteps: ModalTourStep[] = [
  {
    title: 'Admin Dashboard',
    description:
      "Welcome to the Admin Dashboard! This is your command center for all HR operations. Get a bird's-eye view of employees, interns, departmental metrics, and organizational health.",
    imageUrl: '/tour/admin-dashboard-overview.png',
  },
  {
    title: 'Workforce Overview',
    description:
      'These stat cards provide at-a-glance metrics for workforce size, active interns, and review load. Use the dashboard attention banner for urgent follow-ups like overdue reports, onboarding approvals, and late associate EODs.',
    imageUrl: '/tour/admin-stats.png',
  },
  {
    title: 'Department Breakdown',
    description:
      'View headcount and status distribution across all departments. See how many employees are active, on leave, or pending onboarding in each department. Great for resource planning.',
    imageUrl: '/tour/admin-departments.png',
  },
  {
    title: 'Team Events & Milestones',
    description:
      'Track birthdays and work anniversaries for your entire team. Never miss a celebration! This helps you recognize and appreciate your team members.',
    imageUrl: '/tour/admin-milestones.png',
  },
];

// ──────────────────────────────────────────────────────────────
// Map of tour group name to its steps
// ──────────────────────────────────────────────────────────────
export const tourStepsByGroup: Record<string, ModalTourStep[]> = {
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
  if (pathname === '/dashboard' || pathname === '/associate/dashboard') {
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
export const TOUR_GLOBAL_COMPLETED_KEY = 'sn-tour-completed-once';
const TOUR_COOKIE_PREFIX = 'sn_tour_finished_';
const TOUR_COOKIE_GLOBAL = 'sn_tour_completed_once';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefixed = `${name}=`;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(prefixed)) {
      return decodeURIComponent(trimmed.substring(prefixed.length));
    }
  }
  return null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

/** Check if the user already completed any tour at least once */
export function isTourAutoStartDisabled(): boolean {
  try {
    const localValue = localStorage.getItem(TOUR_GLOBAL_COMPLETED_KEY) === 'true';
    const cookieValue = getCookie(TOUR_COOKIE_GLOBAL) === 'true';
    return localValue || cookieValue;
  } catch {
    return getCookie(TOUR_COOKIE_GLOBAL) === 'true';
  }
}

/** Check if a tour group has been completed */
export function isTourCompleted(group: string): boolean {
  try {
    const localValue = localStorage.getItem(`${TOUR_STORAGE_PREFIX}${group}`) === 'true';
    const cookieValue = getCookie(`${TOUR_COOKIE_PREFIX}${group}`) === 'true';
    return localValue || cookieValue;
  } catch {
    return getCookie(`${TOUR_COOKIE_PREFIX}${group}`) === 'true';
  }
}

/** Mark a tour group as completed */
export function markTourCompleted(group: string): void {
  try {
    localStorage.setItem(`${TOUR_STORAGE_PREFIX}${group}`, 'true');
    localStorage.setItem(TOUR_GLOBAL_COMPLETED_KEY, 'true');
  } catch {
    // ignore in SSR / private browsing
  }
  setCookie(`${TOUR_COOKIE_PREFIX}${group}`, 'true', 365);
  setCookie(TOUR_COOKIE_GLOBAL, 'true', 365);
}

/** Reset a specific tour so it can be replayed */
export function resetTour(group: string): void {
  try {
    localStorage.removeItem(`${TOUR_STORAGE_PREFIX}${group}`);
  } catch {
    // ignore
  }
  removeCookie(`${TOUR_COOKIE_PREFIX}${group}`);
}

/** Reset all tours */
export function resetAllTours(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(TOUR_STORAGE_PREFIX));
    for (const key of keys) {
      localStorage.removeItem(key);
    }
    localStorage.removeItem(TOUR_GLOBAL_COMPLETED_KEY);
  } catch {
    // ignore
  }

  // Remove known tour group cookies and global cookie
  const knownGroups = ['dashboard', 'profile', 'tasks', 'admin-dashboard'];
  for (const group of knownGroups) {
    removeCookie(`${TOUR_COOKIE_PREFIX}${group}`);
  }
  removeCookie(TOUR_COOKIE_GLOBAL);
}
