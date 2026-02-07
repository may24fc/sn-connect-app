/**
 * Routes Configuration for UI Consistency Agent
 * All routes that should be checked for UI consistency
 */

import type { RouteConfig, AgentConfig, UICheckType } from './types';

export const publicRoutes: RouteConfig[] = [
  { path: '/', name: 'Home', requiresAuth: false },
  { path: '/login', name: 'Login', requiresAuth: false },
  { path: '/forgot-password', name: 'Forgot Password', requiresAuth: false },
];

export const employeeRoutes: RouteConfig[] = [
  { path: '/dashboard', name: 'Employee Dashboard', requiresAuth: true, authRole: 'employee' },
  { path: '/profile', name: 'Profile', requiresAuth: true, authRole: 'employee' },
  { path: '/announcements', name: 'Announcements', requiresAuth: true, authRole: 'employee' },
  { path: '/files', name: 'Files', requiresAuth: true, authRole: 'employee' },
  { path: '/onboarding', name: 'Onboarding', requiresAuth: true, authRole: 'employee' },
  { path: '/payroll', name: 'Payroll', requiresAuth: true, authRole: 'employee' },
  { path: '/performance', name: 'Performance', requiresAuth: true, authRole: 'employee' },
  { path: '/performance/kpis', name: 'Performance KPIs', requiresAuth: true, authRole: 'employee' },
  { path: '/performance/okrs', name: 'Performance OKRs', requiresAuth: true, authRole: 'employee' },
  { path: '/performance/review', name: 'Performance Review', requiresAuth: true, authRole: 'employee' },
  { path: '/reports', name: 'Reports', requiresAuth: true, authRole: 'employee' },
  { path: '/reports/new', name: 'New Report', requiresAuth: true, authRole: 'employee' },
  { path: '/tasks', name: 'Tasks', requiresAuth: true, authRole: 'employee' },
  // Manager routes (still employee role but with manager permissions)
  { path: '/manager/reviews', name: 'Manager Reviews', requiresAuth: true, authRole: 'employee' },
  { path: '/manager/team-performance', name: 'Team Performance', requiresAuth: true, authRole: 'employee' },
];

export const internRoutes: RouteConfig[] = [
  { path: '/intern/dashboard', name: 'Intern Dashboard', requiresAuth: true, authRole: 'intern' },
];

export const adminRoutes: RouteConfig[] = [
  { path: '/admin/dashboard', name: 'Admin Dashboard', requiresAuth: true, authRole: 'admin' },
  { path: '/admin/interns', name: 'Admin Interns', requiresAuth: true, authRole: 'admin' },
  { path: '/admin/performance', name: 'Admin Performance', requiresAuth: true, authRole: 'admin' },
  { path: '/admin/performance/cycles', name: 'Performance Cycles', requiresAuth: true, authRole: 'admin' },
  { path: '/admin/probation', name: 'Probation', requiresAuth: true, authRole: 'admin' },
  { path: '/admin/reports', name: 'Admin Reports', requiresAuth: true, authRole: 'admin' },
  { path: '/admin/reports/analytics', name: 'Reports Analytics', requiresAuth: true, authRole: 'admin' },
  { path: '/admin/reports/compare', name: 'Reports Compare', requiresAuth: true, authRole: 'admin' },
  { path: '/admin/ai-knowledge', name: 'Admin AI Knowledge', requiresAuth: true, authRole: 'admin' },
];

export const superAdminRoutes: RouteConfig[] = [
  { path: '/super-admin/dashboard', name: 'Super Admin Dashboard', requiresAuth: true, authRole: 'super_admin' },
  { path: '/super-admin/tasks', name: 'Super Admin Tasks', requiresAuth: true, authRole: 'super_admin' },
  { path: '/super-admin/payroll-approvals', name: 'Payroll Approvals', requiresAuth: true, authRole: 'super_admin' },
  { path: '/super-admin/ai-knowledge', name: 'Super Admin AI Knowledge', requiresAuth: true, authRole: 'super_admin' },
];

export const allRoutes: RouteConfig[] = [
  ...publicRoutes,
  ...employeeRoutes,
  ...internRoutes,
  ...adminRoutes,
  ...superAdminRoutes,
];

export const defaultChecks: UICheckType[] = [
  'console-errors',
  'network-errors',
  'accessibility',
  'layout',
  'interactive-elements',
  'images',
];

export const defaultConfig: AgentConfig = {
  baseUrl: 'http://localhost:3000',
  routes: allRoutes,
  screenshotsDir: './e2e/screenshots',
  reportsDir: './e2e/reports',
  viewport: {
    width: 1280,
    height: 720,
  },
  mobileViewport: {
    width: 375,
    height: 667,
  },
  timeouts: {
    navigation: 30000,
    elementWait: 5000,
  },
  checks: defaultChecks,
};
